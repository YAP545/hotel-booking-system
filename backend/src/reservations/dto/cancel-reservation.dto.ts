import { IsNotEmpty } from 'class-validator';

export class CancelReservationDto {
  @IsNotEmpty({ message: 'Cancellation reason is required.' })
  reason: string;
}
