import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, FileText } from 'lucide-react';
import { invoicesService } from '../services/misc.service';
import { Invoice } from '../types';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, SecondaryButton } from '../components/ui';
import { apiErrorMessage } from '../services/api';

export function InvoicesPage() {
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservationId');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (reservationId) {
          const inv = await invoicesService.byReservation(reservationId);
          setSelected(inv);
        } else {
          const all = await invoicesService.all();
          setInvoices(all);
        }
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reservationId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  if (selected) return <InvoiceDetail invoice={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      <PageHeader title="Invoices" subtitle="All issued invoices" />
      {invoices.length === 0 && (
        <EmptyState title="No invoices issued yet" description="Invoices are generated automatically at checkout." />
      )}
      {invoices.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">₹{inv.total}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(inv)}
                      className="flex items-center gap-1 text-brand-600 hover:underline"
                    >
                      <FileText className="h-4 w-4" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function InvoiceDetail({ invoice, onBack }: { invoice: Invoice; onBack: () => void }) {
  const reservation = invoice.reservation;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <SecondaryButton onClick={onBack}>Back to invoices</SecondaryButton>
        <SecondaryButton onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print Invoice
        </SecondaryButton>
      </div>

      <Card className="mx-auto max-w-2xl print:border-none print:shadow-none">
        <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Grand Hotel</h2>
            <p className="text-sm text-slate-500">Hotel Booking Management System</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-slate-800">Invoice {invoice.invoiceNumber}</p>
            {reservation && <p className="text-slate-500">Booking {reservation.bookingReference}</p>}
            <p className="text-slate-500">{new Date(invoice.issuedAt).toLocaleDateString()}</p>
          </div>
        </div>

        {reservation && (
          <div className="mb-6 grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="mb-1 font-semibold text-slate-700">Guest</p>
              <p>
                {reservation.guest.firstName} {reservation.guest.lastName}
              </p>
              <p className="text-slate-500">{reservation.guest.phone}</p>
              {reservation.guest.email && <p className="text-slate-500">{reservation.guest.email}</p>}
            </div>
            <div>
              <p className="mb-1 font-semibold text-slate-700">Stay</p>
              <p>
                Room {reservation.room.roomNumber} — {reservation.room.roomType.name}
              </p>
              <p className="text-slate-500">
                {reservation.checkInDate} → {reservation.checkOutDate}
              </p>
            </div>
          </div>
        )}

        <table className="mb-6 w-full text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-500">Subtotal</td>
              <td className="py-2 text-right">₹{invoice.subtotal}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-500">Tax</td>
              <td className="py-2 text-right">₹{invoice.tax}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-500">Discount</td>
              <td className="py-2 text-right">− ₹{invoice.discount}</td>
            </tr>
            <tr>
              <td className="py-2 font-semibold text-slate-800">Grand Total</td>
              <td className="py-2 text-right text-lg font-bold text-slate-900">₹{invoice.total}</td>
            </tr>
          </tbody>
        </table>

        <p className="text-center text-xs text-slate-400">Thank you for staying with Grand Hotel.</p>
      </Card>
    </div>
  );
}
