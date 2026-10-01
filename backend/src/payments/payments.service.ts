import { Injectable, NotFoundException, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment } from './payment.entity';
import { Reservation } from '../reservations/reservation.entity';
import { PaymentStatus, BookingStatus, UserRole, PaymentMethod } from '../common/enums';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateRazorpayOrderDto, VerifyRazorpayPaymentDto } from './dto/razorpay-payment.dto';
import { AuditLogService } from '../common/services/audit-log.service';
import { EventsGateway } from '../common/gateways/events.gateway';
import { RazorpayService } from './services/razorpay.service';

@Injectable()
export class PaymentsService implements OnModuleInit {
  constructor(
    @InjectRepository(Payment) private paymentsRepo: Repository<Payment>,
    @InjectDataSource() private dataSource: DataSource,
    private auditLog: AuditLogService,
    private eventsGateway: EventsGateway,
    private razorpayService: RazorpayService,
  ) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(
        "ALTER TABLE payments MODIFY COLUMN payment_method ENUM('CASH','CARD','UPI','BANK_TRANSFER','RAZORPAY') NOT NULL",
      );
    } catch {
      // Safe fallback if table is not yet present or driver differs
    }
  }

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

  async create(dto: CreatePaymentDto, currentUser: { id: string; name?: string }) {
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
      const savedPayment = await manager.save(payment);

      await this.auditLog.log(
        {
          userId: currentUser?.id,
          userName: currentUser?.name,
          action: 'RECORD_PAYMENT',
          entity: 'Payment',
          entityId: savedPayment.id,
          description: `${currentUser?.name || 'System'} recorded a payment of ${dto.amount} for booking ${reservation.bookingReference}.`,
        },
        manager,
      );

      this.eventsGateway.broadcastPaymentRecorded(savedPayment);

      return savedPayment;
    });
  }

  async createRazorpayOrder(
    dto: CreateRazorpayOrderDto,
    currentUser: { id: string; email?: string; role?: UserRole },
  ) {
    const reservation = await this.dataSource.manager.findOne(Reservation, {
      where: { id: dto.reservationId },
      relations: ['guest'],
    });
    if (!reservation) throw new NotFoundException('Reservation not found.');

    if (currentUser?.role === UserRole.CUSTOMER && reservation.guest?.email !== currentUser.email) {
      throw new ForbiddenException('You do not have permission to pay for this reservation.');
    }

    if (reservation.bookingStatus === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot create payment order for a cancelled reservation.');
    }

    const outstanding = await this.outstandingBalance(dto.reservationId);
    if (outstanding <= 0) {
      throw new BadRequestException('This reservation is already fully paid.');
    }

    const order = await this.razorpayService.createOrder(dto.reservationId, outstanding);
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
      reservationId: dto.reservationId,
      outstandingAmount: outstanding,
    };
  }

  async createRazorpayQrCode(
    dto: { reservationId: string },
    currentUser: { id: string; email?: string; role?: UserRole },
  ) {
    const reservation = await this.dataSource.manager.findOne(Reservation, {
      where: { id: dto.reservationId },
      relations: ['guest'],
    });
    if (!reservation) throw new NotFoundException('Reservation not found.');

    if (currentUser?.role === UserRole.CUSTOMER && reservation.guest?.email !== currentUser.email) {
      throw new ForbiddenException('You do not have permission to pay for this reservation.');
    }

    if (reservation.bookingStatus === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot create payment QR code for a cancelled reservation.');
    }

    const outstanding = await this.outstandingBalance(dto.reservationId);
    if (outstanding <= 0) {
      throw new BadRequestException('This reservation is already fully paid.');
    }

    const qrResult = await this.razorpayService.createQRCode(dto.reservationId, outstanding);
    return {
      ...qrResult,
      bookingReference: reservation.bookingReference,
      outstandingAmount: outstanding,
    };
  }

  async processRazorpayWebhook(rawBody: string | Buffer, signature: string) {
    const isValid = this.razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new BadRequestException('Invalid Razorpay webhook signature verification failed.');
    }

    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8'));
    const event = payload.event;

    if (!['payment.captured', 'payment.authorized', 'qr_code.credited'].includes(event)) {
      return { status: 'ignored', event };
    }

    const entity = payload.payload?.payment?.entity || payload.payload?.qr_code?.entity || {};
    const paymentId = entity.id || payload.payload?.payment?.entity?.id || `PAY_${Date.now()}`;
    const reservationId = entity.notes?.reservationId || payload.payload?.qr_code?.entity?.notes?.reservationId;

    if (!reservationId) {
      return { status: 'ignored', message: 'No reservationId found in webhook payload notes.' };
    }

    // Idempotency Check: search if payment with this transactionReference already exists
    const existing = await this.paymentsRepo.findOne({ where: { transactionReference: paymentId } });
    if (existing) {
      return { status: 'ok', message: 'Payment already processed (idempotent)', paymentId: existing.id };
    }

    const reservation = await this.dataSource.manager.findOne(Reservation, { where: { id: reservationId } });
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found.`);
    }

    if (reservation.bookingStatus === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot process payment for a cancelled reservation.');
    }

    const outstanding = await this.outstandingBalance(reservationId);
    const amountInRupees = entity.amount ? entity.amount / 100 : (entity.payment_amount ? Number(entity.payment_amount) / 100 : outstanding);

    const payment = await this.create(
      {
        reservationId,
        amount: Math.min(amountInRupees, outstanding > 0 ? outstanding : amountInRupees),
        paymentMethod: PaymentMethod.RAZORPAY,
        transactionReference: paymentId,
      },
      { id: 'webhook', name: 'Razorpay Webhook' },
    );

    return { status: 'ok', paymentId: payment.id };
  }

  async verifyAndRecordRazorpayPayment(
    dto: VerifyRazorpayPaymentDto,
    currentUser: { id: string; name?: string; email?: string; role?: UserRole },
  ) {
    const isValidSignature = this.razorpayService.verifySignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );

    if (!isValidSignature) {
      throw new BadRequestException('Invalid Razorpay payment signature verification failed.');
    }

    const reservation = await this.dataSource.manager.findOne(Reservation, {
      where: { id: dto.reservationId },
      relations: ['guest'],
    });
    if (!reservation) throw new NotFoundException('Reservation not found.');

    if (currentUser?.role === UserRole.CUSTOMER && reservation.guest?.email !== currentUser.email) {
      throw new ForbiddenException('You do not have permission to pay for this reservation.');
    }

    if (reservation.bookingStatus === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot process payment for a cancelled booking.');
    }

    const outstanding = await this.outstandingBalance(dto.reservationId);
    if (outstanding <= 0) {
      throw new BadRequestException('Reservation is already fully paid.');
    }

    return this.create(
      {
        reservationId: dto.reservationId,
        amount: outstanding,
        paymentMethod: PaymentMethod.RAZORPAY,
        transactionReference: dto.razorpayPaymentId,
      },
      { id: currentUser?.id || 'system', name: currentUser?.name || 'Customer' },
    );
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
