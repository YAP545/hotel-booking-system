import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';
import { Reservation } from '../reservations/reservation.entity';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { RoomStatus, ACTIVE_BOOKING_STATUSES } from '../common/enums';
import { EventsGateway } from '../common/gateways/events.gateway';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private repo: Repository<Room>,
    @InjectRepository(Reservation) private reservationsRepo: Repository<Reservation>,
    private eventsGateway: EventsGateway,
  ) {}

  async findAll(filters: {
    roomNumber?: string;
    floor?: number;
    roomTypeId?: string;
    status?: RoomStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50;

    const qb = this.repo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.roomType', 'roomType')
      .where('room.is_active = true')
      .orderBy('room.roomNumber', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.roomNumber) qb.andWhere('room.room_number LIKE :rn', { rn: `%${filters.roomNumber}%` });
    if (filters.floor !== undefined) qb.andWhere('room.floor = :floor', { floor: filters.floor });
    if (filters.roomTypeId) qb.andWhere('room.room_type_id = :rtid', { rtid: filters.roomTypeId });
    if (filters.status) qb.andWhere('room.status = :status', { status: filters.status });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const room = await this.repo.findOne({ where: { id } });
    if (!room) throw new NotFoundException('Room not found.');
    return room;
  }

  async create(dto: CreateRoomDto) {
    const existing = await this.repo.findOne({ where: { roomNumber: dto.roomNumber } });
    if (existing) throw new ConflictException('A room with this number already exists.');
    const room = this.repo.create(dto);
    const saved = await this.repo.save(room);
    this.eventsGateway.broadcastRoomStatusChanged({
      roomId: saved.id,
      roomNumber: saved.roomNumber,
      status: saved.status,
    });
    return saved;
  }

  async update(id: string, dto: UpdateRoomDto) {
    const room = await this.findOne(id);
    const oldStatus = room.status;

    // Guard against manually setting a room OCCUPIED/RESERVED without a real
    // booking backing it — those transitions belong to check-in/reservation flows.
    if (dto.status && [RoomStatus.OCCUPIED, RoomStatus.RESERVED].includes(dto.status) && room.status !== dto.status) {
      const hasActiveReservationToday = await this.reservationsRepo
        .createQueryBuilder('r')
        .where('r.room_id = :id', { id })
        .andWhere('r.booking_status IN (:...statuses)', { statuses: ACTIVE_BOOKING_STATUSES })
        .andWhere('r.check_in_date <= CURDATE() AND r.check_out_date > CURDATE()')
        .getCount();
      if (!hasActiveReservationToday) {
        throw new BadRequestException(
          `Cannot manually set room to ${dto.status} without an active reservation for today. Use the booking or check-in flow instead.`,
        );
      }
    }

    Object.assign(room, dto);
    const saved = await this.repo.save(room);
    if (oldStatus !== saved.status) {
      this.eventsGateway.broadcastRoomStatusChanged({
        roomId: saved.id,
        roomNumber: saved.roomNumber,
        status: saved.status,
      });
    }
    return saved;
  }

  async remove(id: string) {
    const room = await this.findOne(id);
    const reservationCount = await this.reservationsRepo.count({ where: { roomId: id } });
    if (reservationCount > 0) {
      room.isActive = false;
      room.status = RoomStatus.OUT_OF_SERVICE;
      await this.repo.save(room);
      this.eventsGateway.broadcastRoomStatusChanged({
        roomId: room.id,
        roomNumber: room.roomNumber,
        status: room.status,
      });
      return { message: 'Room has booking history and was deactivated instead of deleted.' };
    }
    await this.repo.remove(room);
    return { message: 'Room deleted.' };
  }
}
