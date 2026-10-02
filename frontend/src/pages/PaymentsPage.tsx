import { useEffect, useState } from 'react';
import { paymentsService } from '../services/misc.service';
import { Payment } from '../types';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { PaymentStatusBadge } from '../components/StatusBadges';
import { apiErrorMessage } from '../services/api';

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentsService
      .all()
      .then(setPayments)
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Payments" subtitle="All recorded payments across reservations" />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && payments.length === 0 && <EmptyState title="No payments recorded yet" />}
      {!loading && !error && payments.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 font-medium">₹{p.amount}</td>
                  <td className="px-4 py-3">{p.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={p.paymentStatus} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.transactionReference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
