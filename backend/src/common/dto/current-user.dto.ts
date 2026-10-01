import { UserRole } from '../enums';

export interface CurrentUserDto {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}
