import { api } from './api';
import { AuthUser } from '../types';

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },

  async logout(refreshToken?: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/logout', { refreshToken });
    return data;
  },

  async logoutAll(): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/logout-all');
    return data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    const { data } = await api.patch<{ message: string }>('/auth/change-password', payload);
    return data;
  },
};


