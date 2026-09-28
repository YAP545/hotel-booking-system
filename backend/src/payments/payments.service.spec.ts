import { Test } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment } from './payment.entity';
import { Reservation } from '../reservations/reservation.entity';
import { AuditLogService } from '../common/services/audit-log.service';
import { EventsGateway } from '../common/gateways/events.gateway';
import { RazorpayService } from './services/razorpay.service';
import { PaymentMethod, BookingStatus, UserRole } from '../common/enums';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let razorpayService: RazorpayService;
  let fakeManager: any;
  let reservationRecord: any;

  beforeEach(async () => {
    reservationRecord = {
      id: 'res-1',
      bookingReference: 'HTL-20260928-0001',
      totalAmount: 1000,
      bookingStatus: BookingStatus.CONFIRMED,
      guest: { email: 'customer@example.com' },
    };

    fakeManager = {
      findOne: jest.fn().mockImplementation((entity, opts) => {
        if (entity === Reservation) return Promise.resolve(reservationRecord);
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((entity, data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'payment-1', ...data })),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        RazorpayService,
        { provide: getRepositoryToken(Payment), useValue: {} },
        {
          provide: getDataSourceToken(),
          useValue: {
            manager: fakeManager,
            transaction: (cb: any) => cb(fakeManager),
          },
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        {
          provide: EventsGateway,
          useValue: {
            broadcastPaymentRecorded: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
    razorpayService = moduleRef.get(RazorpayService);
  });

  it('accepts a payment within the outstanding balance', async () => {
    const result = await service.create(
      { reservationId: 'res-1', amount: 500, paymentMethod: PaymentMethod.CARD },
      { id: 'user-1', name: 'Reception' },
    );
    expect(result.amount).toBe(500);
  });

  it('rejects a payment that exceeds the outstanding balance (Rule 9)', async () => {
    await expect(
      service.create(
        { reservationId: 'res-1', amount: 5000, paymentMethod: PaymentMethod.CARD },
        { id: 'user-1', name: 'Reception' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a payment for a cancelled booking', async () => {
    reservationRecord.bookingStatus = BookingStatus.CANCELLED;
    await expect(
      service.create(
        { reservationId: 'res-1', amount: 100, paymentMethod: PaymentMethod.CASH },
        { id: 'user-1', name: 'Reception' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  describe('Razorpay Integration', () => {
    it('creates a Razorpay order for outstanding balance', async () => {
      const order = await service.createRazorpayOrder(
        { reservationId: 'res-1' },
        { id: 'cust-1', email: 'customer@example.com', role: UserRole.CUSTOMER },
      );
      expect(order.orderId).toBeDefined();
      expect(order.amount).toBe(100000); // 1000 INR = 100000 paise
      expect(order.outstandingAmount).toBe(1000);
    });

    it('prevents customer from creating order for another guest reservation', async () => {
      await expect(
        service.createRazorpayOrder(
          { reservationId: 'res-1' },
          { id: 'cust-2', email: 'other@example.com', role: UserRole.CUSTOMER },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('verifies valid HMAC signature and records payment', async () => {
      const orderId = 'order_test_123';
      const paymentId = 'pay_test_456';
      const signature = razorpayService.generateTestSignature(orderId, paymentId);

      const payment = await service.verifyAndRecordRazorpayPayment(
        {
          reservationId: 'res-1',
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
        { id: 'cust-1', email: 'customer@example.com', role: UserRole.CUSTOMER },
      );

      expect(payment.amount).toBe(1000);
      expect(payment.paymentMethod).toBe(PaymentMethod.RAZORPAY);
      expect(payment.transactionReference).toBe(paymentId);
    });

    it('rejects payment verification with invalid signature (zero client trust)', async () => {
      await expect(
        service.verifyAndRecordRazorpayPayment(
          {
            reservationId: 'res-1',
            razorpayOrderId: 'order_test_123',
            razorpayPaymentId: 'pay_test_456',
            razorpaySignature: 'invalid_forged_signature',
          },
          { id: 'cust-1', email: 'customer@example.com', role: UserRole.CUSTOMER },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
