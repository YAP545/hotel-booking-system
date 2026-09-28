import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsString() hotelName?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) taxPercent?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) cancellationFeePercent?: number;
  @IsOptional() @IsNumber() @Min(0) freeCancellationHours?: number;
  @IsOptional() @IsString() checkInTime?: string;
  @IsOptional() @IsString() checkOutTime?: string;
}
