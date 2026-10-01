import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, Between, ILike } from 'typeorm';
import { Reservation } from './reservation.entity';
import { Room } from '../rooms/room.entity';
import { Guest } from '../guests/guest.entity';
import { HotelSettings } from '../settings/hotel-settings.entity';
import { Cancellation } from '../cancellations/cancellation.entity';
import { Payment } from '../payments/payment.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { SearchAvailabilityDto } from './dto/search-availability.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { ACTIVE_BOOKING_STATUSES, BookingStatus, CancellationStatus, RoomStatus, UserRole, PaymentMethod, PaymentStatus } from '../common/enums';

import { generateBookingReference } from '../common/utils/booking-reference';
import { dateRangesOverlap } from '../common/utils/date-overlap';
import { AuditLogService } from '../common/services/audit-log.service';
import { EventsGateway } from '../common/gateways/events.gateway';
import { DynamicPricingService } from '../common/services/dynamic-pricing.service';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation) private reservationsRepo: Repository<Reservation>,
    @InjectRepository(Room) private roomsRepo: Repository<Room>,
    @InjectRepository(Guest) private guestsRepo: Repository<Guest>,
    @InjectRepository(HotelSettings) private settingsRepo: Repository<HotelSettings>,
    @InjectDataSource() private dataSource: DataSource,
    private auditLog: AuditLogService,
    private eventsGateway: EventsGateway,
    private dynamicPricing: DynamicPricingService,
    private emailService: EmailService,
  ) {}

  /**
   * Core overlap rule (Rule 1 / Rule 3): a room is unavailable for a date range
   * if it has any reservation in an "active" status whose range intersects it.
   * Two ranges [aStart,aEnd) and [bStart,bEnd) overlap iff aStart < bEnd AND aEnd > bStart.
   */
  private async hasOverlap(
    roomId: string,
    checkInDate: string,
    checkOutDate: string,
    excludeReservationId?: string,
    manager = this.dataSource.manager,
  ): Promise<boolean> {
    const qb = manager
      .createQueryBuilder(Reservation, 'r')
      .where('r.room_id = :roomId', { roomId })
      .andWhere('r.booking_status IN (:...statuses)', { statuses: ACTIVE_BOOKING_STATUSES })
      .andWhere('r.check_in_date < :checkOutDate', { checkOutDate })
      .andWhere('r.check_out_date > :checkInDate', { checkInDate });

    if (excludeReservationId) {
      qb.andWhere('r.id != :excludeReservationId', { excludeReservationId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  private async getSettings(): Promise<HotelSettings> {
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.settingsRepo.create({ id: 1 });
      settings = await this.settingsRepo.save(settings);
    }
    return settings;
  }

  private nights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const ms = end.getTime() - start.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  /** Search rooms actually free for the given date range (date-based, Rule 3). */
  async searchAvailability(dto: SearchAvailabilityDto) {
    if (new Date(dto.checkOutDate) <= new Date(dto.checkInDate)) {
      throw new BadRequestException('Check-out date must be later than check-in date.');
    }

    const qb = this.roomsRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.roomType', 'roomType')
      .where('room.is_active = true')
      .andWhere('room.status != :outOfService', { outOfService: RoomStatus.OUT_OF_SERVICE })
      .andWhere('room.status != :maintenance', { maintenance: RoomStatus.MAINTENANCE });

    if (dto.roomTypeId) qb.andWhere('room.room_type_id = :roomTypeId', { roomTypeId: dto.roomTypeId });
    if (dto.guests) qb.andWhere('roomType.capacity >= :guests', { guests: dto.guests });
    if (dto.minPrice) qb.andWhere('COALESCE(room.price, roomType.basePrice) >= :minPrice', { minPrice: dto.minPrice });
    if (dto.maxPrice) qb.andWhere('COALESCE(room.price, roomType.basePrice) <= :maxPrice', { maxPrice: dto.maxPrice });

    // Exclude rooms that have any overlapping active reservation.
    qb.andWhere((sub) => {
      const subQuery = sub
        .subQuery()
        .select('res.room_id')
        .from(Reservation, 'res')
        .where('res.booking_status IN (:...statuses)', { statuses: ACTIVE_BOOKING_STATUSES })
        .andWhere('res.check_in_date < :checkOutDate')
        .andWhere('res.check_out_date > :checkInDate')
        .getQuery();
      return 'room.id NOT IN ' + subQuery;
    }).setParameters({ checkInDate: dto.checkInDate, checkOutDate: dto.checkOutDate });

    const rooms = await qb.getMany();

    const totalRooms = await this.roomsRepo.count({ where: { isActive: true } });
    const busyRooms = await this.roomsRepo.count({
      where: [
        { isActive: true, status: RoomStatus.OCCUPIED },
        { isActive: true, status: RoomStatus.RESERVED },
      ],
    });
    const occupancyRate = totalRooms > 0 ? (busyRooms / totalRooms) * 100 : 0;

    return rooms.map((room) => {
      const basePrice = Number(room.price ?? room.roomType.basePrice);
      const pricing = this.dynamicPricing.calculatePrice(
        basePrice,
        dto.checkInDate,
        dto.checkOutDate,
        occupancyRate,
        room.id,
      );
      return {
        ...room,
        pricePerNight: pricing.averagePricePerNight,
        nights: pricing.nights,
        estimatedSubtotal: pricing.subtotal,
        quoteToken: pricing.quoteToken,
        dynamicPricingDetails: pricing,
      };
    });
  }

  async create(
    dto: CreateReservationDto,
    currentUser: { id: string; name?: string; email?: string; role?: UserRole },
  ) {
    if (new Date(dto.checkOutDate) <= new Date(dto.checkInDate)) {
      throw new BadRequestException('Check-out date must be later than check-in date.');
    }

    return this.dataSource.transaction(async (manager) => {
      // Lock the room row for the duration of the transaction to prevent
      // two concurrent requests from both passing the overlap check.
      const room = await manager
        .createQueryBuilder(Room, 'room')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('room.roomType', 'roomType')
        .where('room.id = :id', { id: dto.roomId })
        .getOne();

      if (!room || !room.isActive) {
        throw new NotFoundException('The selected room could not be found.');
      }
      if (room.status === RoomStatus.OUT_OF_SERVICE || room.status === RoomStatus.MAINTENANCE) {
        throw new ConflictException('This room is currently not available for booking.');
      }
      if (dto.numberOfGuests > room.roomType.capacity) {
        throw new BadRequestException(
          `This room type accommodates a maximum of ${room.roomType.capacity} guest(s).`,
        );
      }

      // Customer Role Ownership Guard: Ignore client-provided guestId and force user's Guest record
      let guest: Guest | null = null;
      if (currentUser?.role === UserRole.CUSTOMER) {
        const userEmail = currentUser.email;
        if (!userEmail) {
          throw new ForbiddenException('User email required for customer booking.');
        }
        guest = await manager.findOne(Guest, { where: { email: userEmail } });
        if (!guest) {
          const nameParts = (currentUser.name || 'Customer User').trim().split(' ');
          const firstName = nameParts[0] || 'Customer';
          const lastName = nameParts.slice(1).join(' ') || 'User';
          guest = manager.create(Guest, {
            email: userEmail,
            firstName,
            lastName,
            phone: '',
          });
          guest = await manager.save(guest);
        }
      } else {
        if (!dto.guestId) {
          throw new BadRequestException('guestId is required for staff booking creation.');
        }
        guest = await manager.findOne(Guest, { where: { id: dto.guestId } });
        if (!guest) {
          throw new NotFoundException('Guest not found.');
        }
      }

      const overlap = await this.hasOverlap(
        dto.roomId,
        dto.checkInDate,
        dto.checkOutDate,
        undefined,
        manager,
      );
      if (overlap) {
        throw new ConflictException(
          `Room ${room.roomNumber} is no longer available for the selected dates.`,
        );
      }

      const settings = await this.getSettings();

      // Signed Pricing Quote Validation
      let subtotal = 0;
      let quoteVerified = false;
      if (dto.quoteToken) {
        const verifiedQuote = this.dynamicPricing.verifyQuoteToken(dto.quoteToken);
        if (
          verifiedQuote &&
          verifiedQuote.roomId === dto.roomId &&
          verifiedQuote.checkInDate === dto.checkInDate &&
          verifiedQuote.checkOutDate === dto.checkOutDate
        ) {
          subtotal = verifiedQuote.subtotal;
          quoteVerified = true;
        }
      }

      if (!quoteVerified) {
        const totalRooms = await manager.count(Room, { where: { isActive: true } });
        const busyRooms = await manager.count(Room, {
          where: [
            { isActive: true, status: RoomStatus.OCCUPIED },
            { isActive: true, status: RoomStatus.RESERVED },
          ],
        });
        const occupancyRate = totalRooms > 0 ? (busyRooms / totalRooms) * 100 : 0;
        const basePrice = Number(room.price ?? room.roomType.basePrice);
        const pricing = this.dynamicPricing.calculatePrice(
          basePrice,
          dto.checkInDate,
          dto.checkOutDate,
          occupancyRate,
          room.id,
        );
        subtotal = pricing.subtotal;
      }

      const discount = Number(dto.discount ?? 0);
      const taxableAmount = Math.max(subtotal - discount, 0);
      const tax = Number(((taxableAmount * Number(settings.taxPercent)) / 100).toFixed(2));
      const totalAmount = Number((taxableAmount + tax).toFixed(2));

      const todaysCount = await manager
        .createQueryBuilder(Reservation, 'r')
        .where('DATE(r.created_at) = CURDATE()')
        .getCount();
      const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const bookingReference = `${generateBookingReference(todaysCount)}-${randSuffix}`;


      const reservation = manager.create(Reservation, {
        bookingReference,
        guestId: guest.id,
        roomId: dto.roomId,
        checkInDate: dto.checkInDate,
        checkOutDate: dto.checkOutDate,
        numberOfGuests: dto.numberOfGuests,
        bookingStatus: BookingStatus.CONFIRMED,
        specialRequests: dto.specialRequests,
        subtotal,
        tax,
        discount,
        totalAmount,
      });
      await manager.save(reservation);

      // Rule 3: room.status reflects *today's* physical state, not the whole
      // calendar. Only flip to RESERVED if the stay starts today or has already
      // started, and the room isn't already occupied by a different active stay.
      const today = new Date().toISOString().slice(0, 10);
      if (dto.checkInDate <= today && room.status === RoomStatus.AVAILABLE) {
        room.status = RoomStatus.RESERVED;
        await manager.save(room);
      }

      await this.auditLog.log(
        {
          userId: currentUser?.id,
          userName: currentUser?.name,
          action: 'CREATE_RESERVATION',
          entity: 'Reservation',
          entityId: reservation.id,
          description: `${currentUser?.name || 'System'} created reservation ${bookingReference} for room ${room.roomNumber}.`,
        },
        manager,
      );

      this.eventsGateway.broadcastBookingCreated(reservation);
      this.emailService.sendBookingConfirmation({ ...reservation, guest });
      reservation.guest = guest;
      return reservation;
    });
  }

  async findAll(filters: {
    status?: BookingStatus;
    bookingReference?: string;
    guestName?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;

    const qb = this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.guest', 'guest')
      .leftJoinAndSelect('r.room', 'room')
      .leftJoinAndSelect('room.roomType', 'roomType')
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.status) qb.andWhere('r.booking_status = :status', { status: filters.status });
    if (filters.bookingReference)
      qb.andWhere('r.booking_reference LIKE :ref', { ref: `%${filters.bookingReference}%` });
    if (filters.guestName)
      qb.andWhere('(guest.first_name LIKE :name OR guest.last_name LIKE :name)', {
        name: `%${filters.guestName}%`,
      });
    if (filters.fromDate) qb.andWhere('r.check_in_date >= :fromDate', { fromDate: filters.fromDate });
    if (filters.toDate) qb.andWhere('r.check_out_date <= :toDate', { toDate: filters.toDate });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, currentUser?: { id: string; email?: string; role?: UserRole }) {
    const reservation = await this.reservationsRepo.findOne({
      where: { id },
      relations: ['guest', 'room', 'room.roomType', 'checkIn', 'checkOut'],
    });
    if (!reservation) throw new NotFoundException('Reservation not found.');

    if (currentUser?.role === UserRole.CUSTOMER) {
      if (reservation.guest?.email !== currentUser.email) {
        throw new ForbiddenException('You do not have permission to access this reservation.');
      }
    }

    return reservation;
  }

  async cancel(
    id: string,
    dto: CancelReservationDto,
    currentUser: { id: string; name?: string; email?: string; role?: UserRole },
  ) {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id },
        relations: ['room', 'guest'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) throw new NotFoundException('Reservation not found.');

      if (currentUser?.role === UserRole.CUSTOMER) {
        if (reservation.guest?.email !== currentUser.email) {
          throw new ForbiddenException('You do not have permission to cancel this reservation.');
        }
      }

      if (reservation.bookingStatus === BookingStatus.CANCELLED) {
        throw new BadRequestException('This booking has already been cancelled.');
      }
      if (reservation.bookingStatus === BookingStatus.CHECKED_OUT) {
        throw new BadRequestException('A completed stay cannot be cancelled.');
      }

      // Calculate money actually paid for this booking (sum of PAID + PARTIAL)
      const { sum: paidSum } = await manager
        .createQueryBuilder(Payment, 'p')
        .select('COALESCE(SUM(p.amount), 0)', 'sum')
        .where('p.reservation_id = :reservationId', { reservationId: reservation.id })
        .andWhere('p.payment_status IN (:...statuses)', {
          statuses: [PaymentStatus.PAID, PaymentStatus.PARTIAL],
        })
        .getRawOne();
      const totalPaid = Number(paidSum || 0);

      const settings = await this.getSettings();
      const hoursUntilCheckIn =
        (new Date(reservation.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60);

      let fee = 0;
      if (hoursUntilCheckIn < settings.freeCancellationHours) {
        fee = Number(
          ((Number(reservation.totalAmount) * Number(settings.cancellationFeePercent)) / 100).toFixed(2),
        );
      }

      // Compute refund = max(0, min(totalPaid - fee, totalPaid))
      const rawRefund = totalPaid - fee;
      const refundAmount = Number(Math.max(0, Math.min(rawRefund, totalPaid)).toFixed(2));

      reservation.bookingStatus = BookingStatus.CANCELLED;
      await manager.save(reservation);

      const cancellation = manager.create(Cancellation, {
        reservationId: reservation.id,
        reason: dto.reason,
        cancellationDate: new Date(),
        cancellationFee: fee,
        refundAmount,
        status: CancellationStatus.APPROVED,
      });
      await manager.save(cancellation);

      // Create a REFUNDED payment record ONLY if refundAmount > 0 and totalPaid > 0
      if (refundAmount > 0 && totalPaid > 0) {
        const refundPayment = manager.create(Payment, {
          reservationId: reservation.id,
          amount: refundAmount,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paymentStatus: PaymentStatus.REFUNDED,
          transactionReference: `REFUND-${reservation.bookingReference}`,
          paidAt: new Date(),
        });
        await manager.save(refundPayment);
      }



      // Free up the room if it was held for this booking and isn't mid-stay
      // for another guest.
      const room = reservation.room;
      if (room.status === RoomStatus.RESERVED) {
        const stillOverlapping = await this.hasOverlap(
          room.id,
          new Date().toISOString().slice(0, 10),
          new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          undefined,
          manager,
        );
        room.status = stillOverlapping ? RoomStatus.RESERVED : RoomStatus.AVAILABLE;
        await manager.save(room);
      }

      await this.auditLog.log(
        {
          userId: currentUser?.id,
          userName: currentUser?.name,
          action: 'CANCEL_RESERVATION',
          entity: 'Reservation',
          entityId: reservation.id,
          description: `${currentUser?.name || 'System'} cancelled booking ${reservation.bookingReference}. Refund: ${refundAmount}.`,
        },
        manager,
      );

      this.eventsGateway.broadcastBookingUpdated(reservation);
      this.emailService.sendCancellationNotice(reservation, refundAmount);
      return { reservation, cancellation };
    });
  }

  async update(
    id: string,
    dto: UpdateReservationDto,
    currentUser: { id: string; name?: string; email?: string; role?: UserRole },
  ) {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id },
        relations: ['room', 'guest'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) throw new NotFoundException('Reservation not found.');

      if (reservation.bookingStatus === BookingStatus.CANCELLED) {
        throw new BadRequestException('Cannot update a cancelled booking.');
      }
      if (reservation.bookingStatus === BookingStatus.CHECKED_OUT) {
        throw new BadRequestException('Cannot update a checked-out booking.');
      }

      const newRoomId = dto.roomId ?? reservation.roomId;
      const newCheckIn = dto.checkInDate ?? reservation.checkInDate;
      const newCheckOut = dto.checkOutDate ?? reservation.checkOutDate;

      if (new Date(newCheckOut) <= new Date(newCheckIn)) {
        throw new BadRequestException('Check-out date must be later than check-in date.');
      }

      const room = await manager
        .createQueryBuilder(Room, 'room')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('room.roomType', 'roomType')
        .where('room.id = :id', { id: newRoomId })
        .getOne();

      if (!room || !room.isActive) {
        throw new NotFoundException('The selected room could not be found.');
      }
      if (room.status === RoomStatus.OUT_OF_SERVICE || room.status === RoomStatus.MAINTENANCE) {
        throw new ConflictException('This room is currently not available for booking.');
      }

      const guestsCount = dto.numberOfGuests ?? reservation.numberOfGuests;
      if (guestsCount > room.roomType.capacity) {
        throw new BadRequestException(
          `This room type accommodates a maximum of ${room.roomType.capacity} guest(s).`,
        );
      }

      const overlap = await this.hasOverlap(
        newRoomId,
        newCheckIn,
        newCheckOut,
        reservation.id,
        manager,
      );
      if (overlap) {
        throw new ConflictException(
          `Room ${room.roomNumber} is unavailable for the specified dates.`,
        );
      }

      if (dto.guestId && dto.guestId !== reservation.guestId) {
        const guest = await manager.findOne(Guest, { where: { id: dto.guestId } });
        if (!guest) throw new NotFoundException('Guest not found.');
        reservation.guestId = dto.guestId;
      }

      const settings = await this.getSettings();
      const totalRooms = await manager.count(Room, { where: { isActive: true } });
      const busyRooms = await manager.count(Room, {
        where: [
          { isActive: true, status: RoomStatus.OCCUPIED },
          { isActive: true, status: RoomStatus.RESERVED },
        ],
      });
      const occupancyRate = totalRooms > 0 ? (busyRooms / totalRooms) * 100 : 0;
      const basePrice = Number(room.price ?? room.roomType.basePrice);
      const pricing = this.dynamicPricing.calculatePrice(
        basePrice,
        newCheckIn,
        newCheckOut,
        occupancyRate,
      );

      const subtotal = pricing.subtotal;
      const discount = dto.discount !== undefined ? Number(dto.discount) : Number(reservation.discount ?? 0);
      const taxableAmount = Math.max(subtotal - discount, 0);
      const tax = Number(((taxableAmount * Number(settings.taxPercent)) / 100).toFixed(2));
      const totalAmount = Number((taxableAmount + tax).toFixed(2));

      reservation.roomId = newRoomId;
      reservation.checkInDate = newCheckIn;
      reservation.checkOutDate = newCheckOut;
      reservation.numberOfGuests = guestsCount;
      if (dto.specialRequests !== undefined) reservation.specialRequests = dto.specialRequests;
      reservation.subtotal = subtotal;
      reservation.tax = tax;
      reservation.discount = discount;
      reservation.totalAmount = totalAmount;

      await manager.save(reservation);

      await this.auditLog.log(
        {
          userId: currentUser?.id,
          userName: currentUser?.name,
          action: 'UPDATE_RESERVATION',
          entity: 'Reservation',
          entityId: reservation.id,
          description: `${currentUser?.name || 'System'} updated reservation ${reservation.bookingReference}.`,
        },
        manager,
      );

      const updated = await manager.findOne(Reservation, {
        where: { id: reservation.id },
        relations: ['guest', 'room', 'room.roomType'],
      });

      this.eventsGateway.broadcastBookingUpdated(updated);
      return updated;
    });
  }

  async findMyBookings(email: string) {
    const guest = await this.guestsRepo.findOne({ where: { email } });
    if (!guest) return [];
    return this.reservationsRepo.find({
      where: { guestId: guest.id },
      relations: ['room', 'room.roomType', 'guest'],
      order: { createdAt: 'DESC' },
    });
  }
}
