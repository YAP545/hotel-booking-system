import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGuestDto {
  @IsNotEmpty({ message: 'First name is required.' })
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required.' })
  lastName: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email?: string;

  @IsNotEmpty({ message: 'Phone number is required.' })
  phone: string;

  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() idProofType?: string;
  @IsOptional() @IsString() idProofNumber?: string;
}

export class UpdateGuestDto {
  @IsOptional() @IsNotEmpty() firstName?: string;
  @IsOptional() @IsNotEmpty() lastName?: string;
  @IsOptional() @IsEmail({}, { message: 'Please provide a valid email address.' }) email?: string;
  @IsOptional() @IsNotEmpty() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() idProofType?: string;
  @IsOptional() @IsString() idProofNumber?: string;
}
