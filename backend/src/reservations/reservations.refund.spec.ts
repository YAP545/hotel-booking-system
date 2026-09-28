import { Test } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ReservationsService } from './reservations.service';
import { Reservation } from './reservation.entity';
import { Room } from '../rooms/room.entity';
import { Guest } from '../guests/guest.entity';
import { HotelSettings } from '../settings/hotel-settings.entity';
import { Cancellation } from '../cancellations/cancellation.entity';
import { Payment } from '../payments/payment.entity';
import { AuditLogService } from '../common/services/audit-log.service';
import { EventsGateway } from '../common/gateways/events.gateway';
import { DynamicPricingService } from '../common/services/dynamic-pricing.service';
import { EmailService } from '../common/services/email.service';
import { BookingStatus, PaymentStatus } from '../common/enums';

describe('ReservationsService Cancellation Refund Calculation', () => {
  let service: ReservationsService;
  let savedPayments: any[] = [];
  let savedCancellations: any[] = [];

  const mockSettings = {
    freeCancellationHours: 24,
    cancellationFeePercent: 10, // 10% fee if inside window
  };

  const createMockManager = (totalPaid: number, totalAmount: number, checkInHoursFromNow: number) => {
    savedPayments = [];
    savedCancellations = [];

    const checkInDate = new Date(Date.now() + checkInHoursFromNow * 3600 * 1000).toISOString().slice(0, 10);

    const reservation = {
      id: 'res-123',
      bookingReference: 'HTL-20260928-REFUND',
      totalAmount,
      checkInDate,
      bookingStatus: BookingStatus.CONFIRMED,
      room: { id: 'room-1', status: 'RESERVED' },
      guest: { email: 'guest@example.com' },
    };

    return {
      findOne: jest.fn().mockImplementation((entity) => {
        if (entity === Reservation) return Promise.resolve(reservation);
        if (entity === HotelSettings) return Promise.resolve(mockSettings);
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((entity, data) => data),
      save: jest.fn().mockImplementation((data) => {
        if (data.paymentStatus === PaymentStatus.REFUNDED || data.amount !== undefined) {
          savedPayments.push(data);
        } else if (data.cancellationFee !== undefined) {
          savedCancellations.push(data);
        }
        return Promise.resolve({ id: `id-${Date.now()}`, ...data });
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ sum: String(totalPaid) }),
        getCount: jest.fn().mockResolvedValue(0),
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),

    };
  };

  const setupServiceWithManager = async (mockManager: any) => {
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(mockSettings),
      save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
      create: jest.fn().mockImplementation((x) => x),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: getRepositoryToken(Reservation), useValue: mockRepo },
        { provide: getRepositoryToken(Room), useValue: mockRepo },
        { provide: getRepositoryToken(Guest), useValue: mockRepo },
        { provide: getRepositoryToken(HotelSettings), useValue: mockRepo },
        { provide: getRepositoryToken(Cancellation), useValue: mockRepo },
        { provide: getRepositoryToken(Payment), useValue: mockRepo },
        {
          provide: getDataSourceToken(),
          useValue: {
            manager: mockManager,
            transaction: (cb: any) => cb(mockManager),
          },
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: EventsGateway, useValue: { broadcastBookingUpdated: jest.fn() } },
        { provide: DynamicPricingService, useValue: {} },
        { provide: EmailService, useValue: { sendCancellationNotice: jest.fn() } },
      ],
    }).compile();

    return moduleRef.get(ReservationsService);
  };

  it('1. Unpaid booking cancellation: 0 paid -> 0 refund, no REFUNDED payment record created', async () => {
    const mockManager = createMockManager(0, 8400, 48); // 0 paid, total 8400, outside fee window
    service = await setupServiceWithManager(mockManager);

    const result = await service.cancel('res-123', { reason: 'Test' }, { id: 'user-1', name: 'User' });

    expect(result.cancellation.refundAmount).toBe(0);
    expect(savedPayments.filter((p) => p.paymentStatus === PaymentStatus.REFUNDED)).toHaveLength(0);
  });

  it('2. Partly paid booking cancellation: 4000 paid on 8400 total -> refund = paid (4000) when outside fee window', async () => {
    const mockManager = createMockManager(4000, 8400, 48); // 4000 paid, outside fee window
    service = await setupServiceWithManager(mockManager);

    const result = await service.cancel('res-123', { reason: 'Test' }, { id: 'user-1', name: 'User' });

    expect(result.cancellation.refundAmount).toBe(4000);
    const refundRecords = savedPayments.filter((p) => p.paymentStatus === PaymentStatus.REFUNDED);
    expect(refundRecords).toHaveLength(1);
    expect(refundRecords[0].amount).toBe(4000);
  });

  it('3. Fully paid booking cancellation outside fee window: 8400 paid on 8400 total -> 8400 refund', async () => {
    const mockManager = createMockManager(8400, 8400, 48); // 8400 paid, outside fee window (0 fee)
    service = await setupServiceWithManager(mockManager);

    const result = await service.cancel('res-123', { reason: 'Test' }, { id: 'user-1', name: 'User' });

    expect(result.cancellation.cancellationFee).toBe(0);
    expect(result.cancellation.refundAmount).toBe(8400);
    const refundRecords = savedPayments.filter((p) => p.paymentStatus === PaymentStatus.REFUNDED);
    expect(refundRecords).toHaveLength(1);
    expect(refundRecords[0].amount).toBe(8400);
  });

  it('4. Fully paid booking cancelled INSIDE fee window: 8400 paid, 1000 fee -> 7400 refund', async () => {
    const mockManager = createMockManager(8400, 10000, 10); // 8400 paid, total 10000, inside fee window (10% fee = 1000)
    service = await setupServiceWithManager(mockManager);

    const result = await service.cancel('res-123', { reason: 'Test' }, { id: 'user-1', name: 'User' });

    expect(result.cancellation.cancellationFee).toBe(1000);
    expect(result.cancellation.refundAmount).toBe(7400); // 8400 paid - 1000 fee = 7400
    const refundRecords = savedPayments.filter((p) => p.paymentStatus === PaymentStatus.REFUNDED);
    expect(refundRecords).toHaveLength(1);
    expect(refundRecords[0].amount).toBe(7400);
  });
});
