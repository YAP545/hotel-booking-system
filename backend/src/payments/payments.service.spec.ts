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
  let fakeManager: any;
  let reservationRecord: any;
  let mockRazorpayService: any;
  let paymentsRepoMock: any;
  let auditLogServiceMock: any;

  beforeEach(async () => {
    reservationRecord = {
      id: 'res-1',
      bookingReference: 'HTL-20260928-0001',
      totalAmount: 1000,
      bookingStatus: BookingStatus.CONFIRMED,
      guest: { email: 'customer@example.com' },
    };

    fakeManager = {
      findOne: jest.fn().mockImplementation((entity) => {
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

    mockRazorpayService = {
      isConfiguredStatus: jest.fn().mockReturnValue(true),
      createOrder: jest.fn().mockImplementation((reservationId, amount) =>
        Promise.resolve({
          id: 'order_test_123',
          entity: 'order',
          amount: Math.round(amount * 100),
          currency: 'INR',
          keyId: 'rzp_test_key',
          receipt: `receipt_${reservationId}`,
          status: 'created',
        }),
      ),
      createQRCode: jest.fn().mockImplementation((reservationId, amount) =>
        Promise.resolve({
          id: 'qr_test_123',
          entity: 'qr_code',
          imageUrl: 'https://razorpay.com/qr/test.png',
          amount,
          status: 'active',
          reservationId,
        }),
      ),
      verifySignature: jest
        .fn()
        .mockImplementation((orderId, paymentId, signature) => signature === 'valid_test_signature'),
      verifyWebhookSignature: jest
        .fn()
        .mockImplementation((payload, signature) => signature === 'valid_webhook_signature'),
    };

    paymentsRepoMock = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };

    auditLogServiceMock = {
      log: jest.fn().mockResolvedValue(true),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: RazorpayService, useValue: mockRazorpayService },
        { provide: getRepositoryToken(Payment), useValue: paymentsRepoMock },
        {
          provide: getDataSourceToken(),
          useValue: {
            manager: fakeManager,
            transaction: (cb: any) => cb(fakeManager),
          },
        },
        { provide: AuditLogService, useValue: auditLogServiceMock },
        {
          provide: EventsGateway,
          useValue: {
            broadcastPaymentRecorded: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
  });

  it('accepts a payment within the outstanding balance and writes an audit log entry', async () => {
    const result = await service.create(
      { reservationId: 'res-1', amount: 500, paymentMethod: PaymentMethod.CARD },
      { id: 'user-1', name: 'Reception' },
    );
    expect(result.amount).toBe(500);
    expect(auditLogServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RECORD_PAYMENT',
        entity: 'Payment',
        entityId: 'payment-1',
      }),
      fakeManager,
    );
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

  describe('Razorpay Integration & QR Codes', () => {
    it('creates a Razorpay order for outstanding balance when configured', async () => {
      const order = await service.createRazorpayOrder(
        { reservationId: 'res-1' },
        { id: 'cust-1', email: 'customer@example.com', role: UserRole.CUSTOMER },
      );
      expect(order.orderId).toBe('order_test_123');
      expect(order.amount).toBe(100000); // 1000 INR = 100000 paise
      expect(order.outstandingAmount).toBe(1000);
    });

    it('creates a Razorpay QR Code for outstanding balance for authorized customer', async () => {
      const qr = await service.createRazorpayQrCode(
        { reservationId: 'res-1' },
        { id: 'cust-1', email: 'customer@example.com', role: UserRole.CUSTOMER },
      );
      expect(qr.id).toBe('qr_test_123');
      expect(qr.imageUrl).toBe('https://razorpay.com/qr/test.png');
      expect(qr.outstandingAmount).toBe(1000);
    });

    it('enforces booking ownership and prevents customer from creating QR code for another guest', async () => {
      await expect(
        service.createRazorpayQrCode(
          { reservationId: 'res-1' },
          { id: 'cust-2', email: 'other@example.com', role: UserRole.CUSTOMER },
        ),
      ).rejects.toThrow(ForbiddenException);
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
      const signature = 'valid_test_signature';

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

    it('verifies webhook signature and records payment idempotently', async () => {
      const payload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_web_123',
              amount: 100000,
              notes: { reservationId: 'res-1' },
            },
          },
        },
      });

      // First webhook call processes payment
      const res1 = await service.processRazorpayWebhook(payload, 'valid_webhook_signature');
      expect(res1.status).toBe('ok');
      expect(res1.paymentId).toBe('payment-1');

      // Second webhook call with same transactionReference is idempotent
      paymentsRepoMock.findOne.mockResolvedValueOnce({ id: 'payment-1', transactionReference: 'pay_web_123' });
      const res2 = await service.processRazorpayWebhook(payload, 'valid_webhook_signature');
      expect(res2.status).toBe('ok');
      expect(res2.message).toContain('idempotent');
    });

    it('rejects webhook with invalid signature', async () => {
      const payload = JSON.stringify({ event: 'payment.captured' });
      await expect(service.processRazorpayWebhook(payload, 'invalid_signature')).rejects.toThrow(BadRequestException);
    });
  });
});
