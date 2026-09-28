import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckInService } from './check-in.service';
import { CheckInController } from './check-in.controller';
import { CheckIn } from './check-in.entity';
import { Reservation } from '../reservations/reservation.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { AuditLogService } from '../common/services/audit-log.service';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [TypeOrmModule.forFeature([CheckIn, Reservation, AuditLog])],
  controllers: [CheckInController],
  providers: [CheckInService, AuditLogService, EmailService],
})
export class CheckInModule {}
