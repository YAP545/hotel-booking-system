import { api } from './api';
import { BookingStatus, Paginated, Reservation } from '../types';

export const reservationsService = {
  async list(filters: {
    status?: BookingStatus;
    bookingReference?: string;
    guestName?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<Reservation>> {
    const { data } = await api.get<Paginated<Reservation>>('/reservations', { params: filters });
    return data;
  },
  async get(id: string): Promise<Reservation> {
    const { data } = await api.get<Reservation>(`/reservations/${id}`);
    return data;
  },
  async myBookings(): Promise<Reservation[]> {
    const { data } = await api.get<Reservation[]>('/my-bookings');
    return data;
  },
  async create(payload: {
    guestId: string;
    roomId: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfGuests: number;
    specialRequests?: string;
    discount?: number;
  }): Promise<Reservation> {
    const { data } = await api.post<Reservation>('/reservations', payload);
    return data;
  },
  async update(id: string, payload: Partial<Reservation>): Promise<Reservation> {
    const { data } = await api.patch<Reservation>(`/reservations/${id}`, payload);
    return data;
  },
  cancel(id: string, reason: string) {
    return api.post(`/reservations/${id}/cancel`, { reason });
  },
  checkIn(id: string) {
    return api.post(`/reservations/${id}/check-in`);
  },
  checkOut(id: string) {
    return api.post(`/reservations/${id}/check-out`);
  },
};
