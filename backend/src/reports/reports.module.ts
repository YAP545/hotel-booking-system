import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Reservation } from '../reservations/reservation.entity';
import { Room } from '../rooms/room.entity';
import { Payment } from '../payments/payment.entity';
import { Cancellation } from '../cancellations/cancellation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Room, Payment, Cancellation])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
