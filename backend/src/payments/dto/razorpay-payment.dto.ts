import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRazorpayOrderDto {
  @IsUUID()
  @IsNotEmpty()
  reservationId: string;
}

export class VerifyRazorpayPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  reservationId: string;

  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;
}
