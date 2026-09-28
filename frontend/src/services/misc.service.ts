import { api } from './api';
import { DashboardData, Invoice, Payment, PaymentMethod } from '../types';

export const paymentsService = {
  create(payload: { reservationId: string; amount: number; paymentMethod: PaymentMethod; transactionReference?: string }) {
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
  get: () => api.get('/settings'),
  update: (payload: any) => api.patch('/settings', payload),
};

export const usersService = {
  list: () => api.get('/users'),
  create: (payload: any) => api.post('/users', payload),
  update: (id: string, payload: any) => api.patch(`/users/${id}`, payload),
};
