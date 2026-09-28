import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '../../common/enums';

export class CreatePaymentDto {
  @IsUUID()
  reservationId: string;

  @IsNumber()
  @Min(0.01, { message: 'Payment amount must be greater than zero.' })
  amount: number;

  @IsEnum(PaymentMethod, { message: 'Invalid payment method.' })
  paymentMethod: PaymentMethod;

  @IsOptional()
  transactionReference?: string;
}
