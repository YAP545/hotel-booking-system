import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { ReservationsService } from '../../reservations/reservations.service';
import { InvoicesService } from '../../invoices/invoices.service';
import { Reservation } from '../../reservations/reservation.entity';
import { Room } from '../../rooms/room.entity';
import { Guest } from '../../guests/guest.entity';
import { HotelSettings } from '../../settings/hotel-settings.entity';
import { Invoice } from '../../invoices/invoice.entity';
import { AuditLogService } from '../services/audit-log.service';
import { EventsGateway } from '../gateways/events.gateway';
import { DynamicPricingService } from '../services/dynamic-pricing.service';
import { EmailService } from '../services/email.service';
import { UserRole, BookingStatus } from '../enums';

describe('Customer Authorization Security Audit', () => {
  let reservationsService: ReservationsService;
  let invoicesService: InvoicesService;

  const guestB = { id: 'guest-b-id', email: 'customerB@example.com', firstName: 'Bob', lastName: 'Builder' };
  const guestA = { id: 'guest-a-id', email: 'customerA@example.com', firstName: 'Alice', lastName: 'Smith' };

  const reservationB = {
    id: 'res-b-id',
    bookingReference: 'HTL-20260928-0002',
    bookingStatus: BookingStatus.CONFIRMED,
    guest: guestB,
    guestId: guestB.id,
    room: { id: 'room-1', roomNumber: '101' },
    checkInDate: '2026-10-10',
    checkOutDate: '2026-10-12',
    totalAmount: 300,
  };

  const invoiceB = {
    id: 'inv-b-id',
    invoiceNumber: 'INV-20260928-0002',
    reservation: reservationB,
    reservationId: reservationB.id,
    total: 300,
  };

  beforeEach(async () => {
    const fakeManager: any = {
      findOne: jest.fn().mockImplementation((entity, opts) => {
        if (entity === Room)
          return Promise.resolve({
            id: 'room-1',
            isActive: true,
            status: 'AVAILABLE',
            roomType: { capacity: 2, basePrice: 100 },
          });
        if (entity === Guest) {
          if (opts?.where?.email === 'customerA@example.com') return Promise.resolve(guestA);
          if (opts?.where?.id === 'guest-b-id') return Promise.resolve(guestB);
          return Promise.resolve(null);
        }
        if (entity === Reservation) return Promise.resolve(reservationB);
        return Promise.resolve(null);
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'room-1',
          isActive: true,
          status: 'AVAILABLE',
          roomType: { capacity: 2, basePrice: 100 },
        }),
        getCount: jest.fn().mockResolvedValue(0),
      }),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((entity, data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'new-res-id', ...data })),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReservationsService,
        InvoicesService,
        { provide: getRepositoryToken(Reservation), useValue: { findOne: jest.fn().mockResolvedValue(reservationB) } },
        { provide: getRepositoryToken(Room), useValue: {} },
        { provide: getRepositoryToken(Guest), useValue: { findOne: jest.fn().mockResolvedValue(guestA) } },
        {
          provide: getRepositoryToken(HotelSettings),
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 1, taxPercent: 10 }) },
        },
        { provide: getRepositoryToken(Invoice), useValue: { findOne: jest.fn().mockResolvedValue(invoiceB) } },
        {
          provide: getDataSourceToken(),
          useValue: { manager: fakeManager, transaction: (cb: any) => cb(fakeManager) },
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: EventsGateway, useValue: { broadcastBookingCreated: jest.fn() } },
        { provide: DynamicPricingService, useValue: new DynamicPricingService() },
        { provide: EmailService, useValue: { sendBookingConfirmation: jest.fn(), sendCancellationNotice: jest.fn() } },
      ],
    }).compile();

    reservationsService = moduleRef.get(ReservationsService);
    invoicesService = moduleRef.get(InvoicesService);
  });

  it('denies Customer A read access to Customer B reservation (returns 403 Forbidden)', async () => {
    const userA = { id: 'user-a', email: 'customerA@example.com', role: UserRole.CUSTOMER };
    await expect(reservationsService.findOne('res-b-id', userA)).rejects.toThrow(ForbiddenException);
  });

  it('allows Customer B read access to their own reservation', async () => {
    const userB = { id: 'user-b', email: 'customerB@example.com', role: UserRole.CUSTOMER };
    const res = await reservationsService.findOne('res-b-id', userB);
    expect(res.id).toBe('res-b-id');
  });

  it('denies Customer A cancellation access to Customer B reservation (returns 403 Forbidden)', async () => {
    const userA = { id: 'user-a', name: 'Alice', email: 'customerA@example.com', role: UserRole.CUSTOMER };
    await expect(reservationsService.cancel('res-b-id', { reason: 'Test cancel' }, userA)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('denies Customer A read access to Customer B invoice (returns 403 Forbidden)', async () => {
    const userA = { id: 'user-a', email: 'customerA@example.com', role: UserRole.CUSTOMER };
    await expect(invoicesService.findOne('inv-b-id', userA)).rejects.toThrow(ForbiddenException);
  });

  it('ignores guestId provided by Customer A and attaches Customer A guest record on creation', async () => {
    const userA = { id: 'user-a', name: 'Alice Smith', email: 'customerA@example.com', role: UserRole.CUSTOMER };
    const dto = {
      guestId: 'guest-b-id', // Trying to book under Bob's guestId!
      roomId: 'room-1',
      checkInDate: '2026-10-15',
      checkOutDate: '2026-10-17',
      numberOfGuests: 1,
    };

    const result = await reservationsService.create(dto, userA);
    // Verified: guestId in created reservation is guestA.id ('guest-a-id'), ignoring client-provided 'guest-b-id'
    expect(result.guestId).toBe('guest-a-id');
  });
});
