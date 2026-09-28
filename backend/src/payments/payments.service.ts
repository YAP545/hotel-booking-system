import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment } from './payment.entity';
import { Reservation } from '../reservations/reservation.entity';
import { PaymentStatus, BookingStatus, UserRole } from '../common/enums';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AuditLogService } from '../common/services/audit-log.service';
import { EventsGateway } from '../common/gateways/events.gateway';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private paymentsRepo: Repository<Payment>,
    @InjectDataSource() private dataSource: DataSource,
    private auditLog: AuditLogService,
    private eventsGateway: EventsGateway,
  ) {}

  /** Total already paid (PAID + PARTIAL rows) for a reservation. */
  async totalPaid(reservationId: string, manager = this.dataSource.manager): Promise<number> {
    const { sum } = await manager
      .createQueryBuilder(Payment, 'p')
      .select('COALESCE(SUM(p.amount), 0)', 'sum')
      .where('p.reservation_id = :reservationId', { reservationId })
      .andWhere('p.payment_status IN (:...statuses)', {
        statuses: [PaymentStatus.PAID, PaymentStatus.PARTIAL],
      })
      .getRawOne();
    return Number(sum);
  }

  async outstandingBalance(reservationId: string, manager = this.dataSource.manager): Promise<number> {
    const reservation = await manager.findOne(Reservation, { where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Reservation not found.');
    const paid = await this.totalPaid(reservationId, manager);
    return Number((Number(reservation.totalAmount) - paid).toFixed(2));
  }

  async create(dto: CreatePaymentDto, currentUser: { id: string; name: string }) {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, { where: { id: dto.reservationId } });
      if (!reservation) throw new NotFoundException('Reservation not found.');
      if (reservation.bookingStatus === BookingStatus.CANCELLED) {
        throw new BadRequestException('Cannot record a payment for a cancelled booking.');
      }

      const outstanding = await this.outstandingBalance(dto.reservationId, manager);
      if (dto.amount > outstanding + 0.01) {
        throw new BadRequestException(
          `Payment amount exceeds the outstanding balance of ${outstanding}.`,
        );
      }

      const remainingAfter = Number((outstanding - dto.amount).toFixed(2));
      const payment = manager.create(Payment, {
        reservationId: dto.reservationId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        paymentStatus: remainingAfter <= 0.01 ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
        transactionReference: dto.transactionReference,
        paidAt: new Date(),
      });
      await manager.save(payment);

      await this.auditLog.log(
        {
          userId: currentUser?.id,
          userName: currentUser?.name,
          action: 'RECORD_PAYMENT',
          entity: 'Payment',
          entityId: payment.id,
          description: `${currentUser?.name || 'System'} recorded a payment of ${dto.amount} for booking ${reservation.bookingReference}.`,
        },
        manager,
      );

      this.eventsGateway.broadcastPaymentRecorded(payment);

      return payment;
    });
  }

  async findByReservation(
    reservationId: string,
    currentUser?: { id: string; email?: string; role?: UserRole },
  ) {
    if (currentUser?.role === UserRole.CUSTOMER) {
      const reservation = await this.dataSource.manager.findOne(Reservation, {
        where: { id: reservationId },
        relations: ['guest'],
      });
      if (!reservation || reservation.guest?.email !== currentUser.email) {
        throw new ForbiddenException('You do not have permission to access these payments.');
      }
    }

    return this.paymentsRepo.find({
      where: { reservationId },
      order: { createdAt: 'ASC' },
    });
  }

  async findAll() {
    return this.paymentsRepo.find({ order: { createdAt: 'DESC' }, take: 200 });
  }
}
