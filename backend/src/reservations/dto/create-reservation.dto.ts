import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';
import { IsAfterDate } from '../../common/validators/is-after-date.validator';

export class CreateReservationDto {
  @IsOptional()
  @IsUUID()
  guestId?: string;

  @IsUUID()
  roomId: string;

  @IsDateString({}, { message: 'Check-in date must be a valid date (YYYY-MM-DD).' })
  checkInDate: string;

  @IsDateString({}, { message: 'Check-out date must be a valid date (YYYY-MM-DD).' })
  @IsAfterDate('checkInDate', { message: 'Check-out date must be strictly after check-in date.' })
  checkOutDate: string;

  @IsInt()
  @Min(1, { message: 'Number of guests must be at least 1.' })
  numberOfGuests: number;

  @IsOptional()
  @IsNotEmpty()
  specialRequests?: string;

  // Optional: applied as a flat currency discount by staff (e.g. promo).
  @IsOptional()
  discount?: number;

  @IsOptional()
  quoteToken?: string;
}

