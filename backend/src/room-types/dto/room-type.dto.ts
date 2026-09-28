import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomTypeDto {
  @IsNotEmpty({ message: 'Room type name is required.' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1, { message: 'Capacity must be at least 1.' })
  capacity: number;

  @IsNumber()
  @Min(0, { message: 'Base price cannot be negative.' })
  basePrice: number;

  @IsOptional()
  @IsArray()
  amenities?: string[];
}

export class UpdateRoomTypeDto {
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Base price cannot be negative.' })
  basePrice?: number;

  @IsOptional()
  @IsArray()
  amenities?: string[];

  @IsOptional()
  isActive?: boolean;
}
