import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './payment.entity';
import { Reservation } from '../reservations/reservation.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { AuditLogService } from '../common/services/audit-log.service';
import { RazorpayService } from './services/razorpay.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Reservation, AuditLog])],
  controllers: [PaymentsController],
  providers: [PaymentsService, AuditLogService, RazorpayService],
  exports: [PaymentsService, RazorpayService],
})
export class PaymentsModule {}

