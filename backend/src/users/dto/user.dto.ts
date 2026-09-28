import { IsEmail, IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Name is required.' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  password: string;

  @IsEnum(UserRole, { message: 'Invalid role.' })
  role: UserRole;

  @IsOptional()
  phone?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsNotEmpty() name?: string;
  @IsOptional() @IsEnum(UserRole, { message: 'Invalid role.' }) role?: UserRole;
  @IsOptional() phone?: string;
  @IsOptional() isActive?: boolean;
}
