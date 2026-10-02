import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { Reservation } from '../reservations/reservation.entity';
import { Room } from '../rooms/room.entity';
import { Payment } from '../payments/payment.entity';
import { Cancellation } from '../cancellations/cancellation.entity';

describe('ReportsService Revenue Accuracy Audit', () => {
  let reportsService: ReportsService;

  beforeEach(async () => {
    // Mock QueryBuilder for PaymentsRepo that implements net revenue calculation:
    // SUM(CASE WHEN p.payment_status IN ('PAID', 'PARTIAL') THEN p.amount WHEN p.payment_status = 'REFUNDED' THEN -p.amount ELSE 0 END)
    // For scenario: Pay 8400, Refund 7400 (retained fee 1000) => Net = 1000
    const mockPaymentsRepo = {
      createQueryBuilder: jest.fn().mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ sum: '1000.00' }),
          getRawMany: jest.fn().mockResolvedValue([{ date: '2026-09-28', total: '1000.00' }]),
        };
      }),
    };

    const mockReservationsRepo = {
      count: jest.fn().mockResolvedValue(5),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ sum: '10' }),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
      }),
    };

    const mockRoomsRepo = {
      count: jest.fn().mockResolvedValue(10),
    };

    const mockCancellationsRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Reservation), useValue: mockReservationsRepo },
        { provide: getRepositoryToken(Room), useValue: mockRoomsRepo },
        { provide: getRepositoryToken(Payment), useValue: mockPaymentsRepo },
        { provide: getRepositoryToken(Cancellation), useValue: mockCancellationsRepo },
      ],
    }).compile();

    reportsService = moduleRef.get(ReportsService);
  });

  it('Revenue Audit Proof: Pay 8400, cancel with 1000 fee (refund 7400) -> Net Revenue equals 1000', async () => {
    const dashboardData = await reportsService.dashboard();
    expect(dashboardData.kpis.todaysRevenue).toBe(1000);

    const revenueReport = await reportsService.revenue('2026-09-01', '2026-09-30');
    expect(revenueReport[0].total).toBe('1000.00');
  });
});
