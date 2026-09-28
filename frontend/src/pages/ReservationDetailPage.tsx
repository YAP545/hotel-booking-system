import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogIn, LogOut, XCircle, CreditCard, FileText, QrCode } from 'lucide-react';
import { reservationsService } from '../services/reservations.service';
import { paymentsService, invoicesService } from '../services/misc.service';
import { Reservation, Payment, PaymentMethod } from '../types';
import { Card, ErrorState, Input, LoadingState, PageHeader, PrimaryButton, SecondaryButton, Select } from '../components/ui';
import { BookingStatusBadge, PaymentStatusBadge } from '../components/StatusBadges';
import { Modal, ConfirmDialog } from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { initiateRazorpayPayment } from '../utils/razorpay';
import { PaymentQrModal } from '../components/PaymentQrModal';


export function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancel, setShowCancel] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST';

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [res, pays] = await Promise.all([
        reservationsService.get(id),
        paymentsService.byReservation(id),
      ]);
      setReservation(res);
      setPayments(pays);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleCheckIn() {
    if (!id) return;
    try {
      await reservationsService.checkIn(id);
      show('Guest checked in successfully.', 'success');
      load();
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    }
  }

  async function handleCheckOut() {
    if (!id) return;
    try {
      await reservationsService.checkOut(id);
      show('Guest checked out. Invoice generated.', 'success');
      load();
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    }
  }

  async function handleCancel(reason: string) {
    if (!id) return;
    try {
      await reservationsService.cancel(id, reason);
      show('Reservation cancelled.', 'success');
      setShowCancel(false);
      load();
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    }
  }

  if (loading) return <LoadingState />;
  if (error || !reservation) return <ErrorState message={error || 'Reservation not found.'} />;

  const totalPaid = payments
    .filter((p) => p.paymentStatus === 'PAID' || p.paymentStatus === 'PARTIAL')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = Number(reservation.totalAmount) - totalPaid;

  return (
    <div>
      <button onClick={() => navigate('/reservations')} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to reservations
      </button>

      <PageHeader
        title={reservation.bookingReference}
        subtitle={`Created ${new Date(reservation.createdAt).toLocaleString()}`}
        actions={<BookingStatusBadge status={reservation.bookingStatus} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Booking Details</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-slate-500">Guest</span>
            <span className="text-right font-medium text-slate-900">{reservation.guest.firstName} {reservation.guest.lastName}</span>
            <span className="text-slate-500">Phone</span>
            <span className="text-right">{reservation.guest.phone}</span>
            <span className="text-slate-500">Room</span>
            <span className="text-right">{reservation.room.roomNumber} — {reservation.room.roomType.name}</span>
            <span className="text-slate-500">Check-in</span>
            <span className="text-right">{reservation.checkInDate}</span>
            <span className="text-slate-500">Check-out</span>
            <span className="text-right">{reservation.checkOutDate}</span>
            <span className="text-slate-500">Guests</span>
            <span className="text-right">{reservation.numberOfGuests}</span>
            {reservation.specialRequests && (
              <>
                <span className="text-slate-500">Special requests</span>
                <span className="text-right">{reservation.specialRequests}</span>
              </>
            )}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4 text-sm">
            <div className="grid grid-cols-2 gap-y-1">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-right">₹{reservation.subtotal}</span>
              <span className="text-slate-500">Tax</span>
              <span className="text-right">₹{reservation.tax}</span>
              <span className="text-slate-500">Discount</span>
              <span className="text-right">− ₹{reservation.discount}</span>
              <span className="font-semibold text-slate-800">Total</span>
              <span className="text-right font-semibold text-slate-900">₹{reservation.totalAmount}</span>
              <span className="text-slate-500">Paid</span>
              <span className="text-right text-green-700">₹{totalPaid.toFixed(2)}</span>
              <span className="font-medium text-slate-700">Outstanding</span>
              <span className={`text-right font-medium ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{outstanding.toFixed(2)}
              </span>
            </div>
          </div>

          {canManage && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {reservation.bookingStatus === 'CONFIRMED' && (
                <PrimaryButton onClick={handleCheckIn}><LogIn className="h-4 w-4" /> Check In</PrimaryButton>
              )}
              {reservation.bookingStatus === 'CHECKED_IN' && (
                <PrimaryButton onClick={handleCheckOut}><LogOut className="h-4 w-4" /> Check Out</PrimaryButton>
              )}
              {(reservation.bookingStatus === 'CONFIRMED' || reservation.bookingStatus === 'PENDING') && (
                <SecondaryButton onClick={() => setShowCancel(true)} className="text-red-600 hover:bg-red-50">
                  <XCircle className="h-4 w-4" /> Cancel Booking
                </SecondaryButton>
              )}
              {outstanding > 0 && reservation.bookingStatus !== 'CANCELLED' && (
                <>
                  <SecondaryButton onClick={() => setShowPayment(true)}>
                    <CreditCard className="h-4 w-4" /> Record Payment
                  </SecondaryButton>
                  <SecondaryButton onClick={() => setShowQrModal(true)} className="border-brand-300 text-brand-700 hover:bg-brand-50">
                    <QrCode className="h-4 w-4 text-brand-600" /> Pay via QR
                  </SecondaryButton>
                </>
              )}
              {reservation.bookingStatus === 'CHECKED_OUT' && (
                <Link to={`/invoices?reservationId=${reservation.id}`}>
                  <SecondaryButton><FileText className="h-4 w-4" /> View Invoice</SecondaryButton>
                </Link>
              )}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Payment History</h3>
          {payments.length === 0 && <p className="text-sm text-slate-400">No payments recorded yet.</p>}
          <ul className="space-y-3">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-800">₹{p.amount}</p>
                  <p className="text-xs text-slate-500">{p.paymentMethod} · {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</p>
                </div>
                <PaymentStatusBadge status={p.paymentStatus} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {showCancel && (
        <CancelBookingModal onClose={() => setShowCancel(false)} onConfirm={handleCancel} />
      )}
      {showPayment && (
        <RecordPaymentModal
          reservationId={reservation.id}
          outstanding={outstanding}
          guestName={reservation.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}` : ''}
          guestEmail={reservation.guest?.email || ''}
          guestPhone={reservation.guest?.phone || ''}
          bookingReference={reservation.bookingReference}
          onClose={() => setShowPayment(false)}
          onSaved={() => { setShowPayment(false); load(); }}
        />
      )}
      {showQrModal && (
        <PaymentQrModal
          reservation={reservation}
          onClose={() => setShowQrModal(false)}
          onPaymentSuccess={() => {
            setShowQrModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CancelBookingModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal title="Cancel Reservation" onClose={onClose} widthClass="max-w-md">
      <Input label="Cancellation reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="mt-6 flex justify-end gap-3">
        <SecondaryButton onClick={onClose}>Back</SecondaryButton>
        <PrimaryButton onClick={() => reason && onConfirm(reason)} className="bg-red-600 hover:bg-red-700">
          Confirm Cancellation
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function RecordPaymentModal({
  reservationId,
  outstanding,
  guestName,
  guestEmail,
  guestPhone,
  bookingReference,
  onClose,
  onSaved,
}: {
  reservationId: string;
  outstanding: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  bookingReference?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const [method, setMethod] = useState<PaymentMethod>('RAZORPAY');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (method === 'RAZORPAY') {
        onClose();
        initiateRazorpayPayment({
          reservationId,
          bookingReference,
          guestName,
          guestEmail,
          guestPhone,
          onSuccess: () => {
            show('Payment recorded successfully via Razorpay!', 'success');
            onSaved();
          },
          onError: (err) => show(err, 'error'),
        });
        return;
      }
      await paymentsService.create({ reservationId, amount: parseFloat(amount), paymentMethod: method });
      show('Payment recorded.', 'success');
      onSaved();
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Record Payment" onClose={onClose} widthClass="max-w-sm">
      <div className="space-y-4">
        <Input label={`Amount (outstanding: ₹${outstanding.toFixed(2)})`} type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={method === 'RAZORPAY'} />
        <Select label="Payment method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          <option value="RAZORPAY">Razorpay (Online Payment)</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card (POS)</option>
          <option value="UPI">UPI</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
        </Select>
        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} disabled={submitting}>
            {method === 'RAZORPAY' ? 'Proceed to Razorpay' : 'Record Payment'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

