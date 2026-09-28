import { api } from './api';
import { AvailableRoom, Paginated, Room, RoomStatus, RoomType } from '../types';

export const roomTypesService = {
  async list(): Promise<RoomType[]> {
    const { data } = await api.get<RoomType[]>('/room-types');
    return data;
  },
  create(payload: Partial<RoomType>) {
    return api.post('/room-types', payload);
  },
  update(id: string, payload: Partial<RoomType>) {
    return api.patch(`/room-types/${id}`, payload);
  },
  remove(id: string) {
    return api.delete(`/room-types/${id}`);
  },
};

export const roomsService = {
  async list(filters: {
    roomNumber?: string;
    floor?: number;
    roomTypeId?: string;
    status?: RoomStatus;
    page?: number;
    limit?: number;
  }): Promise<Paginated<Room>> {
    const { data } = await api.get<Paginated<Room>>('/rooms', { params: filters });
    return data;
  },
  async searchAvailable(params: {
    checkInDate: string;
    checkOutDate: string;
    guests?: number;
    roomTypeId?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<AvailableRoom[]> {
    const { data } = await api.get<AvailableRoom[]>('/rooms/available', { params });
    return data;
  },
  create(payload: { roomNumber: string; roomTypeId: string; floor: number; price?: number; description?: string }) {
    return api.post('/rooms', payload);
  },
  update(id: string, payload: Partial<Room> & { status?: RoomStatus }) {
    return api.patch(`/rooms/${id}`, payload);
  },
  remove(id: string) {
    return api.delete(`/rooms/${id}`);
  },
};
