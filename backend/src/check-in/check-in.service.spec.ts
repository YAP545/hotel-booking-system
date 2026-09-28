import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { EmailService } from '../common/services/email.service';
import { EventsGateway } from '../common/gateways/events.gateway';
import { BookingStatus } from '../common/enums';

describe('CheckInService', () => {
  let service: CheckInService;
  let fakeManager: any;
  let reservationRecord: any;

  beforeEach(async () => {
    reservationRecord = {
      id: 'res-1',
      bookingReference: 'HTL-20260926-0001',
      bookingStatus: BookingStatus.CONFIRMED,
      room: { id: 'room-1', roomNumber: '101' },
      checkIn: null,
    };

    fakeManager = {
      findOne: jest.fn().mockResolvedValue(reservationRecord),
      create: jest.fn().mockImplementation((entity, data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CheckInService,
        {
          provide: getDataSourceToken(),
          useValue: { transaction: (cb: any) => cb(fakeManager) },
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: EmailService, useValue: { sendCheckInWelcome: jest.fn() } },
        {
          provide: EventsGateway,
          useValue: {
            broadcastCheckInCompleted: jest.fn(),
            broadcastRoomStatusChanged: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(CheckInService);
  });

  it('checks in a confirmed booking successfully', async () => {
    const result = await service.checkIn('res-1', { id: 'u1', name: 'Reception' });
    expect(result.reservation.bookingStatus).toBe(BookingStatus.CHECKED_IN);
  });

  it('rejects check-in for a cancelled booking (Rule 6)', async () => {
    reservationRecord.bookingStatus = BookingStatus.CANCELLED;
    await expect(service.checkIn('res-1', { id: 'u1', name: 'Reception' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a duplicate check-in', async () => {
    reservationRecord.bookingStatus = BookingStatus.CHECKED_IN;
    await expect(service.checkIn('res-1', { id: 'u1', name: 'Reception' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects check-in for a pending (unconfirmed) booking', async () => {
    reservationRecord.bookingStatus = BookingStatus.PENDING;
    await expect(service.checkIn('res-1', { id: 'u1', name: 'Reception' })).rejects.toThrow(
      BadRequestException,
    );
  });
});
