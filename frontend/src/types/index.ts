export type UserRole = 'ADMIN' | 'RECEPTIONIST' | 'CUSTOMER';

export type RoomStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'OCCUPIED'
  | 'CLEANING'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW';

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface RoomType {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: string | number;
  amenities: string[] | null;
  isActive: boolean;
}

export interface Room {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  roomType: RoomType;
  floor: number;
  status: RoomStatus;
  price: string | number | null;
  description: string | null;
  isActive: boolean;
}

export interface AvailableRoom extends Room {
  pricePerNight: number;
  nights: number;
  estimatedSubtotal: number;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  idProofType?: string | null;
  idProofNumber?: string | null;
}

export interface GuestDetail extends Guest {
  reservations: Reservation[];
  completedStays?: number;
  totalNights?: number;
  totalSpent: number;
  isVip?: boolean;
  loyaltyTier?: 'STANDARD' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

export interface Reservation {
  id: string;
  bookingReference: string;
  guestId: string;
  guest: Guest;
  roomId: string;
  room: Room;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  bookingStatus: BookingStatus;
  specialRequests: string | null;
  subtotal: string | number;
  tax: string | number;
  discount: string | number;
  totalAmount: string | number;
  createdAt: string;
}

export interface Payment {
  id: string;
  reservationId: string;
  amount: string | number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionReference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  reservationId: string;
  reservation?: Reservation;
  invoiceNumber: string;
  subtotal: string | number;
  tax: string | number;
  discount: string | number;
  total: string | number;
  issuedAt: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  createdAt: string;
}

export interface DashboardData {
  kpis: {
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    reservedRooms: number;
    todaysCheckIns: number;
    todaysCheckOuts: number;
    activeReservations: number;
    todaysRevenue: number;
    adr?: number;
    revpar?: number;
  };
  charts: {
    revenueOverTime: { date: string; total: string }[];
    occupancyRate: number;
    bookingStatusDistribution: { status: string; count: string }[];
    roomTypePopularity: { roomType: string; bookings: string }[];
  };
  recentBookings: Reservation[];
  upcomingCheckIns: Reservation[];
  upcomingCheckOuts: Reservation[];
  pendingPayments: Reservation[];
}
