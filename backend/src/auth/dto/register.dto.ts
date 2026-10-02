import { IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Name is required.' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  password: string;

  @IsOptional()
  phone?: string;
}
