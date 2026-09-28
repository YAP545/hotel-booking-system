import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckOutService } from './check-out.service';
import { CheckOutController } from './check-out.controller';
import { CheckOut } from './check-out.entity';
import { Reservation } from '../reservations/reservation.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Payment } from '../payments/payment.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { AuditLogService } from '../common/services/audit-log.service';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [TypeOrmModule.forFeature([CheckOut, Reservation, Invoice, Payment, AuditLog])],
  controllers: [CheckOutController],
  providers: [CheckOutService, AuditLogService, PaymentsService, EmailService],
})
export class CheckOutModule {}
