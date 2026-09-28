import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { Reservation } from './reservation.entity';
import { Room } from '../rooms/room.entity';
import { Guest } from '../guests/guest.entity';
import { HotelSettings } from '../settings/hotel-settings.entity';
import { Cancellation } from '../cancellations/cancellation.entity';
import { Payment } from '../payments/payment.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { AuditLogService } from '../common/services/audit-log.service';
import { DynamicPricingService } from '../common/services/dynamic-pricing.service';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, Room, Guest, HotelSettings, Cancellation, Payment, AuditLog]),
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, AuditLogService, DynamicPricingService, EmailService],
  exports: [ReservationsService, DynamicPricingService, EmailService],
})
export class ReservationsModule {}

