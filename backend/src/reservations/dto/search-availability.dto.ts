import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsAfterDate } from '../../common/validators/is-after-date.validator';

export class SearchAvailabilityDto {
  @IsDateString()
  checkInDate: string;

  @IsDateString()
  @IsAfterDate('checkInDate', { message: 'Check-out date must be strictly after check-in date.' })
  checkOutDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests?: number;

  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;
}
