import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { RoomStatus } from '../../common/enums';

export class CreateRoomDto {
  @IsNotEmpty({ message: 'Room number is required.' })
  roomNumber: string;

  @IsUUID()
  roomTypeId: string;

  @IsInt()
  @Min(0)
  floor: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Price cannot be negative.' })
  price?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsNotEmpty()
  roomNumber?: string;

  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  floor?: number;

  @IsOptional()
  @IsEnum(RoomStatus, { message: 'Invalid room status.' })
  status?: RoomStatus;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Price cannot be negative.' })
  price?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  isActive?: boolean;
}
