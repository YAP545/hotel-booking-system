import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Reservation } from '../reservations/reservation.entity';
import { CheckIn } from './check-in.entity';
import { BookingStatus, RoomStatus } from '../common/enums';
import { AuditLogService } from '../common/services/audit-log.service';
import { EventsGateway } from '../common/gateways/events.gateway';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class CheckInService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private auditLog: AuditLogService,
    private eventsGateway: EventsGateway,
    private emailService: EmailService,
  ) {}

  async checkIn(reservationId: string, currentUser: { id: string; name: string }) {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id: reservationId },
        relations: ['room', 'checkIn', 'guest'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) throw new NotFoundException('Reservation not found.');

      // Rule 6: cannot check in a cancelled booking.
      if (reservation.bookingStatus === BookingStatus.CANCELLED) {
        throw new BadRequestException('This booking has already been cancelled.');
      }
      if (reservation.bookingStatus === BookingStatus.CHECKED_IN) {
        throw new ConflictException('This guest has already been checked in.');
      }
      if (reservation.bookingStatus === BookingStatus.CHECKED_OUT) {
        throw new BadRequestException('This booking has already been completed.');
      }
      if (reservation.bookingStatus !== BookingStatus.CONFIRMED) {
        throw new BadRequestException('Only confirmed bookings can be checked in.');
      }
      if (reservation.checkIn) {
        throw new ConflictException('A check-in record already exists for this booking.');
      }

      reservation.bookingStatus = BookingStatus.CHECKED_IN;
      await manager.save(reservation);

      const room = reservation.room;
      room.status = RoomStatus.OCCUPIED;
      await manager.save(room);

      const checkIn = manager.create(CheckIn, {
        reservationId: reservation.id,
        roomId: room.id,
        checkInTime: new Date(),
        checkedInById: currentUser.id,
      });
      await manager.save(checkIn);

      await this.auditLog.log(
        {
          userId: currentUser?.id,
          userName: currentUser?.name,
          action: 'CHECK_IN',
          entity: 'Reservation',
          entityId: reservation.id,
          description: `${currentUser?.name || 'System'} checked in booking ${reservation.bookingReference} to room ${room.roomNumber}.`,
        },
        manager,
      );

      this.eventsGateway.broadcastCheckInCompleted({ reservation, checkIn });
      this.eventsGateway.broadcastRoomStatusChanged({ roomId: room.id, roomNumber: room.roomNumber, status: room.status });
      this.emailService.sendCheckInWelcome(reservation, room.roomNumber);

      return { reservation, checkIn };
    });
  }
}
