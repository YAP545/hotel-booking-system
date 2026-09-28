import { RoomStatus, BookingStatus, PaymentStatus } from '../types';

const roomStyles: Record<RoomStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800 border-green-300',
  RESERVED: 'bg-blue-100 text-blue-800 border-blue-300',
  OCCUPIED: 'bg-red-100 text-red-800 border-red-300',
  CLEANING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  MAINTENANCE: 'bg-orange-100 text-orange-800 border-orange-300',
  OUT_OF_SERVICE: 'bg-slate-200 text-slate-700 border-slate-300',
};

const bookingStyles: Record<BookingStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border-slate-300',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-300',
  CHECKED_IN: 'bg-green-100 text-green-800 border-green-300',
  CHECKED_OUT: 'bg-slate-200 text-slate-700 border-slate-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
  NO_SHOW: 'bg-orange-100 text-orange-800 border-orange-300',
};

const paymentStyles: Record<PaymentStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border-slate-300',
  PARTIAL: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PAID: 'bg-green-100 text-green-800 border-green-300',
  REFUNDED: 'bg-blue-100 text-blue-800 border-blue-300',
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label.replace(/_/g, ' ')}
    </span>
  );
}

export const RoomStatusBadge = ({ status }: { status: RoomStatus }) => (
  <Badge label={status} className={roomStyles[status]} />
);
export const BookingStatusBadge = ({ status }: { status: BookingStatus }) => (
  <Badge label={status} className={bookingStyles[status]} />
);
export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
  <Badge label={status} className={paymentStyles[status]} />
);
