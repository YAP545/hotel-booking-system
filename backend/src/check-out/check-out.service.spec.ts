import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { CheckOutService } from './check-out.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../common/services/email.service';
import { EventsGateway } from '../common/gateways/events.gateway';
import { BookingStatus } from '../common/enums';

describe('CheckOutService', () => {
  let service: CheckOutService;
  let fakeManager: any;
  let reservationRecord: any;
  let outstanding: number;

  beforeEach(async () => {
    outstanding = 0;
    reservationRecord = {
      id: 'res-1',
      bookingReference: 'HTL-20260926-0001',
      bookingStatus: BookingStatus.CHECKED_IN,
      totalAmount: 1000,
      subtotal: 900,
      tax: 100,
      discount: 0,
      room: { id: 'room-1', roomNumber: '101' },
      checkOut: null,
    };

    fakeManager = {
      findOne: jest.fn().mockResolvedValue(reservationRecord),
      create: jest.fn().mockImplementation((entity, data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
      createQueryBuilder: jest.fn().mockReturnValue({ getCount: jest.fn().mockResolvedValue(0) }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CheckOutService,
        {
          provide: getDataSourceToken(),
          useValue: { transaction: (cb: any) => cb(fakeManager) },
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        {
          provide: PaymentsService,
          useValue: { outstandingBalance: jest.fn().mockImplementation(() => Promise.resolve(outstanding)) },
        },
        { provide: EmailService, useValue: { sendCheckOutReceipt: jest.fn() } },
        {
          provide: EventsGateway,
          useValue: {
            broadcastCheckOutCompleted: jest.fn(),
            broadcastRoomStatusChanged: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(CheckOutService);
  });

  it('rejects checkout for a booking that has not checked in (Rule 7)', async () => {
    reservationRecord.bookingStatus = BookingStatus.CONFIRMED;
    await expect(service.checkOut('res-1', { id: 'u1', name: 'Reception' })).rejects.toThrow(BadRequestException);
  });

  it('blocks checkout when there is an outstanding balance', async () => {
    outstanding = 250;
    await expect(service.checkOut('res-1', { id: 'u1', name: 'Reception' })).rejects.toThrow(BadRequestException);
  });

  it('completes checkout, moves room to CLEANING, and issues an invoice when fully paid', async () => {
    outstanding = 0;
    const result = await service.checkOut('res-1', { id: 'u1', name: 'Reception' });
    expect(result.reservation.bookingStatus).toBe(BookingStatus.CHECKED_OUT);
    expect(result.reservation.room.status).toBe('CLEANING');
    expect(result.invoice.total).toBe(1000);
  });
});
