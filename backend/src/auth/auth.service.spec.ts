import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: any;
  let refreshTokenRepo: any;

  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@hotel.com',
    passwordHash: '$2b$10$e.w2.bM2oYq9S.U5qW4JzeR/8G9W0q2o0/2o0.2o0.2o0.2o0.2o0', // hash of 'OldPass123'
    role: 'ADMIN',
    isActive: true,
  };

  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('OldPass123', 10);
    usersRepo = {
      findOne: jest.fn().mockResolvedValue(mockUser),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };
    refreshTokenRepo = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'rt-1', ...dto })),
      save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('changePassword', () => {
    it('should change password successfully when current password is correct', async () => {
      const result = await service.changePassword('user-1', {
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456',
      });
      expect(result).toEqual({ message: 'Password updated successfully.' });
      expect(usersRepo.save).toHaveBeenCalled();
      const updatedUser = usersRepo.save.mock.calls[0][0];
      const match = await bcrypt.compare('NewPass456', updatedUser.passwordHash);
      expect(match).toBe(true);
    });

    it('should throw UnauthorizedException if current password does not match', async () => {
      await expect(
        service.changePassword('user-1', {
          currentPassword: 'WrongPassword',
          newPassword: 'NewPass456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if new password equals current password', async () => {
      await expect(
        service.changePassword('user-1', {
          currentPassword: 'OldPass123',
          newPassword: 'OldPass123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('should rotate token successfully for a valid refresh token', async () => {
      const validToken = {
        id: 'rt-100',
        token: 'valid-uuid',
        user: mockUser,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
      };
      refreshTokenRepo.findOne.mockResolvedValue(validToken);

      const result = await service.refreshToken('valid-uuid');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(validToken.isRevoked).toBe(true);
    });

    it('should throw UnauthorizedException for an expired or revoked token', async () => {
      const revokedToken = {
        id: 'rt-100',
        token: 'revoked-uuid',
        user: mockUser,
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000),
      };
      refreshTokenRepo.findOne.mockResolvedValue(revokedToken);

      await expect(service.refreshToken('revoked-uuid')).rejects.toThrow(UnauthorizedException);
    });
  });
});

