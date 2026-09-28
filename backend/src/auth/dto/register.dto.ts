import { IsEmail, IsEnum, IsNotEmpty, MinLength, IsOptional } from 'class-validator';
import { UserRole } from '../../common/enums';

export class RegisterDto {
  @IsNotEmpty({ message: 'Name is required.' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  password: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid role.' })
  role?: UserRole;

  @IsOptional()
  phone?: string;
}
