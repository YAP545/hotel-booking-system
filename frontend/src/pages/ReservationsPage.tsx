import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, List } from 'lucide-react';
import { reservationsService } from '../services/reservations.service';
import { BookingStatus, Reservation } from '../types';
import {
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  PrimaryButton,
  Select,
  SecondaryButton,
} from '../components/ui';
import { BookingStatusBadge } from '../components/StatusBadges';
import { apiErrorMessage } from '../services/api';
import { BookingWizard } from '../components/BookingWizard';
import { ReservationTimeline } from '../components/ReservationTimeline';

const STATUS_OPTIONS: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'];

export function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [bookingReference, setBookingReference] = useState('');
  const [guestName, setGuestName] = useState('');
  const [status, setStatus] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservationsService.list({
        bookingReference: bookingReference || undefined,
        guestName: guestName || undefined,
        status: (status as BookingStatus) || undefined,
        page,
        limit: 10,
      });
      setReservations(res.data);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [bookingReference, guestName, page, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- safe: async fetch triggered by pagination/status change, no infinite loop
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only refetch on page/status change; bookingReference/guestName applied via form submit, not on every keystroke
  }, [page, status]);

  return (
    <div>
      <PageHeader
        title="Reservations"
        subtitle="Search, manage, and track all hotel bookings"
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" /> List View
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="h-3.5 w-3.5 text-brand-600" /> Timeline Drag & Drop
              </button>
            </div>
            <PrimaryButton onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4" /> New Booking
            </PrimaryButton>
          </div>
        }
      />

      {viewMode === 'timeline' ? (
        <ReservationTimeline />
      ) : (
        <>
          <Card className="mb-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                load();
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <Input
                  label="Booking reference"
                  placeholder="HTL-..."
                  value={bookingReference}
                  onChange={(e) => setBookingReference(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input label="Guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  label="Status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </Select>
              </div>
              <SecondaryButton>
                <Search className="h-4 w-4" /> Search
              </SecondaryButton>
            </form>
          </Card>

          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && reservations.length === 0 && (
            <EmptyState title="No reservations found" description="Try a different search, or create a new booking." />
          )}

          {!loading && !error && reservations.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Booking ID</th>
                    <th className="px-4 py-3">Guest</th>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3">Check-out</th>
                    <th className="px-4 py-3">Guests</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link to={`/reservations/${r.id}`} className="font-medium text-brand-600 hover:underline">
                          {r.bookingReference}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {r.guest.firstName} {r.guest.lastName}
                      </td>
                      <td className="px-4 py-3">{r.room.roomNumber}</td>
                      <td className="px-4 py-3">{r.checkInDate}</td>
                      <td className="px-4 py-3">{r.checkOutDate}</td>
                      <td className="px-4 py-3">{r.numberOfGuests}</td>
                      <td className="px-4 py-3">₹{r.totalAmount}</td>
                      <td className="px-4 py-3">
                        <BookingStatusBadge status={r.bookingStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <SecondaryButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    Previous
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </SecondaryButton>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {showWizard && (
        <BookingWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => {
            setShowWizard(false);
            setPage(1);
            load();
          }}
        />
      )}
    </div>
  );
}
