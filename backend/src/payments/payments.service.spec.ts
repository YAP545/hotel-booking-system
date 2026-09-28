import { Test } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment } from './payment.entity';
import { Reservation } from '../reservations/reservation.entity';
import { AuditLogService } from '../common/services/audit-log.service';
import { EventsGateway } from '../common/gateways/events.gateway';
import { PaymentMethod, BookingStatus } from '../common/enums';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let fakeManager: any;
  let reservationRecord: any;

  beforeEach(async () => {
    reservationRecord = {
      id: 'res-1',
      bookingReference: 'HTL-20260926-0001',
      totalAmount: 1000,
      bookingStatus: BookingStatus.CONFIRMED,
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
});
