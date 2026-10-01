import { IsUUID } from 'class-validator';

export class CreateRazorpayQrDto {
  @IsUUID(undefined, { message: 'reservationId must be a valid UUID' })
  reservationId: string;
}
