import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Reservation } from '../reservations/reservation.entity';
import { CheckOut } from './check-out.entity';
import { Invoice } from '../invoices/invoice.entity';
import { BookingStatus, RoomStatus } from '../common/enums';
import { AuditLogService } from '../common/services/audit-log.service';
import { PaymentsService } from '../payments/payments.service';
import { EventsGateway } from '../common/gateways/events.gateway';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class CheckOutService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private auditLog: AuditLogService,
    private paymentsService: PaymentsService,
    private eventsGateway: EventsGateway,
    private emailService: EmailService,
  ) {}

  async checkOut(
    reservationId: string,
    currentUser: { id: string; name: string },
    options: { allowOutstanding?: boolean } = {},
  ) {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id: reservationId },
        relations: ['room', 'checkOut', 'guest'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) throw new NotFoundException('Reservation not found.');

      // Rule 7: cannot check out unless currently checked in.
      if (reservation.bookingStatus !== BookingStatus.CHECKED_IN) {
        throw new BadRequestException('Only checked-in guests can be checked out.');
      }
      if (reservation.checkOut) {
        throw new ConflictException('A check-out record already exists for this booking.');
      }

      const outstanding = await this.paymentsService.outstandingBalance(reservationId, manager);
      if (outstanding > 0.01 && !options.allowOutstanding) {
        throw new BadRequestException(
          `Cannot check out: an outstanding balance of ${outstanding} remains. Record full payment first.`,
        );
      }

      reservation.bookingStatus = BookingStatus.CHECKED_OUT;
      await manager.save(reservation);

      // Rule 5: checked-out room becomes CLEANING, not directly AVAILABLE.
      const room = reservation.room;
      room.status = RoomStatus.CLEANING;
      await manager.save(room);

      const checkOut = manager.create(CheckOut, {
        reservationId: reservation.id,
        roomId: room.id,
        checkOutTime: new Date(),
        finalAmount: reservation.totalAmount,
        checkedOutById: currentUser.id,
      });
      await manager.save(checkOut);

      // Auto-issue the invoice at checkout, snapshotting the final figures.
      const invoiceCount = await manager.createQueryBuilder(Invoice, 'i').getCount();
      const invoice = manager.create(Invoice, {
        reservationId: reservation.id,
        invoiceNumber: `INV-${String(invoiceCount + 1).padStart(6, '0')}`,
        subtotal: reservation.subtotal,
        tax: reservation.tax,
        discount: reservation.discount,
        total: reservation.totalAmount,
        issuedAt: new Date(),
      });
      await manager.save(invoice);

      await this.auditLog.log(
        {
          userId: currentUser?.id,
          userName: currentUser?.name,
          action: 'CHECK_OUT',
          entity: 'Reservation',
          entityId: reservation.id,
          description: `${currentUser?.name || 'System'} checked out booking ${reservation.bookingReference}.`,
        },
        manager,
      );

      this.eventsGateway.broadcastCheckOutCompleted({ reservation, checkOut, invoice });
      this.eventsGateway.broadcastRoomStatusChanged({ roomId: room.id, roomNumber: room.roomNumber, status: room.status });
      this.emailService.sendCheckOutReceipt(reservation, invoice.invoiceNumber, Number(reservation.totalAmount));

      return { reservation, checkOut, invoice };
    });
  }
}
