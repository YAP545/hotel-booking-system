import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '../common/enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(RefreshToken) private refreshTokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: UserRole.CUSTOMER,
      phone: dto.phone,
    });

    await this.usersRepo.save(user);

    const { accessToken, refreshToken } = await this.generateTokens(user);
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async refreshToken(tokenString: string) {
    if (!tokenString) {
      throw new UnauthorizedException('Refresh token is required.');
    }
    const tokenRecord = await this.refreshTokenRepo.findOne({
      where: { token: tokenString },
      relations: ['user'],
    });

    if (!tokenRecord || tokenRecord.isRevoked || new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Revoke old refresh token (rotation)
    tokenRecord.isRevoked = true;
    await this.refreshTokenRepo.save(tokenRecord);

    if (!tokenRecord.user || !tokenRecord.user.isActive) {
      throw new UnauthorizedException('User account is inactive.');
    }

    // Issue new pair
    return this.generateTokens(tokenRecord.user);
  }

  async logout(tokenString?: string) {
    if (tokenString) {
      const record = await this.refreshTokenRepo.findOne({ where: { token: tokenString } });
      if (record) {
        record.isRevoked = true;
        await this.refreshTokenRepo.save(record);
      }
    }
    return { message: 'Logged out successfully.' };
  }

  async logoutAll(userId: string) {
    await this.refreshTokenRepo.update({ userId, isRevoked: false }, { isRevoked: true });
    return { message: 'Logged out of all devices successfully.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive.');
    }
    const matches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect.');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password.');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepo.save(user);
    // Revoke all existing refresh tokens after password change
    await this.logoutAll(userId);
    return { message: 'Password updated successfully.' };
  }

  private async generateTokens(user: User) {
    const accessToken = this.signToken(user);
    const refreshTokenString = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days TTL

    const refreshTokenRecord = this.refreshTokenRepo.create({
      token: refreshTokenString,
      userId: user.id,
      expiresAt,
      isRevoked: false,
    });
    await this.refreshTokenRepo.save(refreshTokenRecord);

    return { accessToken, refreshToken: refreshTokenString };
  }

  private signToken(user: User) {
    return this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
  }
}


