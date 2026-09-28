import { api } from './api';
import { Guest, GuestDetail, Paginated } from '../types';

export const guestsService = {
  async list(search?: string, page = 1, limit = 20): Promise<Paginated<Guest>> {
    const { data } = await api.get<Paginated<Guest>>('/guests', { params: { search, page, limit } });
    return data;
  },
  async get(id: string): Promise<GuestDetail> {
    const { data } = await api.get<GuestDetail>(`/guests/${id}`);
    return data;
  },
  create(payload: Partial<Guest>) {
    return api.post('/guests', payload);
  },
  update(id: string, payload: Partial<Guest>) {
    return api.patch(`/guests/${id}`, payload);
  },
};
