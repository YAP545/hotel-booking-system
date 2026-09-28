import { useEffect, useState } from 'react';
import { reservationsService } from '../services/reservations.service';
import { Reservation } from '../types';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, SecondaryButton } from '../components/ui';
import { BookingStatusBadge } from '../components/StatusBadges';
import { apiErrorMessage } from '../services/api';
import { Calendar, BedDouble, FileText, XCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function MyBookingsPage() {
  const { show } = useToast();
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadBookings() {
    setLoading(true);
    setError(null);
    try {
      const data = await reservationsService.myBookings();
      setBookings(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function handleCancel(id: string) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await reservationsService.cancel(id, 'Guest requested cancellation via portal');
      show('Booking cancelled.', 'success');
      loadBookings();
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="My Bookings"
        subtitle="View and manage your hotel reservations and stay receipts"
      />

      {loading && <LoadingState label="Loading your reservations..." />}
      {error && <ErrorState message={error} />}

      {!loading && !error && bookings.length === 0 && (
        <EmptyState
          title="No bookings found"
          description="You currently have no active or past reservations under this account."
        />
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-slate-900">
                    {booking.bookingReference}
                  </span>
                  <BookingStatusBadge status={booking.bookingStatus} />
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-4 w-4 text-brand-600" />
                    Room {booking.room?.roomNumber} ({booking.room?.roomType?.name || 'Standard'})
                  </span>

                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-brand-600" />
                    {booking.checkInDate} → {booking.checkOutDate}
                  </span>
                </div>

                {booking.specialRequests && (
                  <p className="text-xs text-slate-500 italic">
                    Special Requests: "{booking.specialRequests}"
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Total Amount</p>
                  <p className="text-lg font-bold text-brand-700">₹{booking.totalAmount}</p>
                </div>

                <div className="flex items-center gap-2">
                  {booking.bookingStatus === 'CONFIRMED' && (
                    <SecondaryButton onClick={() => handleCancel(booking.id)} className="text-red-600 hover:bg-red-50 border-red-200">
                      <XCircle className="h-4 w-4" /> Cancel
                    </SecondaryButton>
                  )}

                  {booking.bookingStatus === 'CHECKED_OUT' && (
                    <SecondaryButton onClick={() => window.print()}>
                      <FileText className="h-4 w-4" /> Receipt
                    </SecondaryButton>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
