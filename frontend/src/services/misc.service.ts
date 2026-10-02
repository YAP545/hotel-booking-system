import { api } from './api';
import { DashboardData, Invoice, Payment, PaymentMethod } from '../types';

export interface HotelSettingsPayload {
  hotelName?: string;
  taxPercent?: number;
  cancellationFeePercent?: number;
  freeCancellationHours?: number;
  checkInTime?: string;
  checkOutTime?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: 'ADMIN' | 'RECEPTIONIST' | 'CUSTOMER';
  isActive?: boolean;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: 'ADMIN' | 'RECEPTIONIST' | 'CUSTOMER';
  isActive?: boolean;
}

export const paymentsService = {
  create(payload: {
    reservationId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionReference?: string;
  }) {
    return api.post<Payment>('/payments', payload);
  },
  async createRazorpayOrder(reservationId: string) {
    const { data } = await api.post<{
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      reservationId: string;
      outstandingAmount: number;
    }>('/payments/razorpay/create-order', { reservationId });
    return data;
  },
  async verifyRazorpayPayment(payload: {
    reservationId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const { data } = await api.post<Payment>('/payments/razorpay/verify', payload);
    return data;
  },
  async createRazorpayQr(reservationId: string) {
    const { data } = await api.post<{
      success?: boolean;
      fallback?: boolean;
      id?: string;
      imageUrl?: string;
      amount: number;
      status?: string;
      reservationId: string;
      bookingReference?: string;
      message?: string;
    }>('/payments/razorpay/create-qr', { reservationId });
    return data;
  },
  async byReservation(reservationId: string): Promise<Payment[]> {
    const { data } = await api.get<Payment[]>('/payments', { params: { reservationId } });
    return data;
  },
  async all(): Promise<Payment[]> {
    const { data } = await api.get<Payment[]>('/payments');
    return data;
  },
};

export const invoicesService = {
  async byReservation(reservationId: string): Promise<Invoice> {
    const { data } = await api.get<Invoice>('/invoices', { params: { reservationId } });
    return data;
  },
  async all(): Promise<Invoice[]> {
    const { data } = await api.get<Invoice[]>('/invoices');
    return data;
  },
};

export const reportsService = {
  async dashboard(): Promise<DashboardData> {
    const { data } = await api.get<DashboardData>('/reports/dashboard');
    return data;
  },
  revenue: (fromDate?: string, toDate?: string) => api.get('/reports/revenue', { params: { fromDate, toDate } }),
  occupancy: (fromDate?: string, toDate?: string) => api.get('/reports/occupancy', { params: { fromDate, toDate } }),
  cancellations: (fromDate?: string, toDate?: string) =>
    api.get('/reports/cancellations', { params: { fromDate, toDate } }),
  roomPerformance: () => api.get('/reports/room-performance'),
  paymentSummary: (fromDate?: string, toDate?: string) =>
    api.get('/reports/payment-summary', { params: { fromDate, toDate } }),
};

export const settingsService = {
  get: () => api.get<HotelSettingsPayload>('/settings'),
  update: (payload: HotelSettingsPayload) => api.patch('/settings', payload),
};

export const usersService = {
  list: () => api.get('/users'),
  create: (payload: CreateUserPayload) => api.post('/users', payload),
  update: (id: string, payload: UpdateUserPayload) => api.patch(`/users/${id}`, payload),
};
