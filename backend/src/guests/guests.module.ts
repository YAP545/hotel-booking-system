import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestsService } from './guests.service';
import { GuestsController } from './guests.controller';
import { Guest } from './guest.entity';
import { Reservation } from '../reservations/reservation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Guest, Reservation])],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule {}
