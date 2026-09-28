import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';
import { IsAfterDate } from '../../common/validators/is-after-date.validator';

export class UpdateReservationDto {
  @IsOptional()
  @IsUUID()
  guestId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Check-in date must be a valid date (YYYY-MM-DD).' })
  checkInDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Check-out date must be a valid date (YYYY-MM-DD).' })
  @IsAfterDate('checkInDate', { message: 'Check-out date must be strictly after check-in date.' })
  checkOutDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Number of guests must be at least 1.' })
  numberOfGuests?: number;

  @IsOptional()
  @IsNotEmpty()
  specialRequests?: string;

  @IsOptional()
  discount?: number;
}
