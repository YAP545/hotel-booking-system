import { useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { QrCode, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { PrimaryButton, SecondaryButton } from './ui';
import { paymentsService } from '../services/misc.service';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Reservation } from '../types';
import { apiErrorMessage } from '../services/api';

interface PaymentQrModalProps {
  reservation: Reservation;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export function PaymentQrModal({ reservation, onClose, onPaymentSuccess }: PaymentQrModalProps) {
  const { user } = useAuth();
  const { show } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [amountToPay, setAmountToPay] = useState<number>(Number(reservation.totalAmount));
  const [isPaid, setIsPaid] = useState(false);
  const [markingAsPaid, setMarkingAsPaid] = useState(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST';

  const generateFallbackUpiQr = useCallback(
    async (amount: number) => {
      const vpa = import.meta.env.VITE_HOTEL_UPI_VPA;
      if (!vpa) {
        setQrImageUrl(null);
        setIsFallback(true);
        setFallbackMessage(
          'Razorpay QR Code API is unavailable and no fallback HOTEL_UPI_VPA is configured in environment.',
        );
        return;
      }

      try {
        const hotelName = 'Grand Hotel';
        const ref = reservation.bookingReference || reservation.id.slice(0, 8);
        const upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(hotelName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(ref)}`;

        const dataUrl = await QRCode.toDataURL(upiUrl, {
          width: 250,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setQrImageUrl(dataUrl);
        setIsFallback(true);
      } catch (err: any) {
        setError('Failed to generate fallback UPI QR code.');
      }
    },
    [reservation.bookingReference, reservation.id],
  );

  const initializeQr = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await paymentsService.createRazorpayQr(reservation.id);
      setAmountToPay(res.amount || Number(reservation.totalAmount));

      if (res.fallback || !res.imageUrl) {
        setFallbackMessage(
          res.message || 'Razorpay QR Code API is unavailable on this account. Displaying standard UPI QR.',
        );
        await generateFallbackUpiQr(res.amount || Number(reservation.totalAmount));
      } else {
        setQrImageUrl(res.imageUrl);
        setIsFallback(false);
      }
    } catch (err: any) {
      const msg = apiErrorMessage(err);
      setFallbackMessage(`${msg} — Fallback UPI QR generated.`);
      await generateFallbackUpiQr(Number(reservation.totalAmount));
    } finally {
      setLoading(false);
    }
  }, [reservation.id, reservation.totalAmount, generateFallbackUpiQr]);

  // Poll payment status every 3 seconds until paid
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initializeQr();

    const interval = setInterval(async () => {
      try {
        const payments = await paymentsService.byReservation(reservation.id);
        const paidSum = payments
          .filter((p) => p.paymentStatus === 'PAID' || p.paymentStatus === 'PARTIAL')
          .reduce((sum, p) => sum + Number(p.amount), 0);

        if (paidSum >= Number(reservation.totalAmount) - 0.01) {
          setIsPaid(true);
          show('Payment verified successfully!', 'success');
          onPaymentSuccess();
          clearInterval(interval);
        }
      } catch {
        // Ignore background polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation.id]);

  async function handleMarkAsPaid() {
    if (!canManage) return;
    setMarkingAsPaid(true);
    try {
      await paymentsService.create({
        reservationId: reservation.id,
        amount: amountToPay,
        paymentMethod: 'UPI',
        transactionReference: `MANUAL_UPI_${Date.now()}`,
      });
      setIsPaid(true);
      show('Payment recorded manually via UPI.', 'success');
      onPaymentSuccess();
    } catch (err: any) {
      show(apiErrorMessage(err), 'error');
    } finally {
      setMarkingAsPaid(false);
    }
  }

  return (
    <Modal title="Pay via QR Code" onClose={onClose} widthClass="max-w-md">
      <div className="flex flex-col items-center justify-center p-2 text-center">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <p className="text-sm text-slate-500">Generating secure QR code...</p>
          </div>
        ) : isPaid ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Payment Complete!</h4>
            <p className="text-sm text-slate-500">
              Payment of <span className="font-semibold text-slate-900">₹{amountToPay.toFixed(2)}</span> received for
              booking <span className="font-semibold text-brand-600">{reservation.bookingReference}</span>.
            </p>
            <PrimaryButton onClick={onClose} className="mt-4 w-full">
              Close Window
            </PrimaryButton>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Amount Due</p>
              <p className="text-2xl font-extrabold text-brand-700">₹{amountToPay.toFixed(2)}</p>
              <p className="text-xs text-slate-600 mt-0.5">Booking Ref: {reservation.bookingReference}</p>
            </div>

            {fallbackMessage && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-left text-xs text-amber-800 border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{fallbackMessage}</span>
              </div>
            )}

            <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-white shadow-inner">
              {qrImageUrl ? (
                <img src={qrImageUrl} alt="Payment QR Code" className="h-56 w-56 object-contain rounded-lg" />
              ) : (
                <div className="h-56 w-56 flex items-center justify-center text-slate-400">
                  <QrCode className="h-12 w-12" />
                </div>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
                <span>Waiting for payment... (Scanning supported)</span>
              </div>
            </div>

            {isFallback && import.meta.env.VITE_HOTEL_UPI_VPA && (
              <p className="text-xs text-slate-500">
                Scan with any UPI App (GPay, PhonePe, Paytm) using VPA{' '}
                <span className="font-semibold text-slate-700">{import.meta.env.VITE_HOTEL_UPI_VPA}</span>.
              </p>
            )}

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              {canManage && (
                <SecondaryButton
                  onClick={handleMarkAsPaid}
                  disabled={markingAsPaid}
                  className="w-full justify-center text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                >
                  {markingAsPaid ? 'Processing...' : 'Mark as Paid (Staff Manual Confirm)'}
                </SecondaryButton>
              )}
              <SecondaryButton onClick={onClose} className="w-full justify-center text-xs">
                Cancel
              </SecondaryButton>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
