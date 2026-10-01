import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { BarChart2, Inbox } from 'lucide-react';
import { reportsService } from '../services/misc.service';
import { Card, ErrorState, Input, LoadingState, PageHeader, SecondaryButton } from '../components/ui';
import { apiErrorMessage } from '../services/api';

function todayMinus(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function ChartEmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
      <BarChart2 className="mb-2 h-8 w-8 text-slate-300" />
      <p className="text-sm font-medium text-slate-600">No {label} Data</p>
      <p className="text-xs text-slate-400">There are no records for the selected date range.</p>
    </div>
  );
}

interface RevenueRow { date: string; total: string | number; }
interface OccupancyRow { date: string; roomsBooked: number; occupancyRate: string | number; }
interface CancellationRow { 
  id: string; 
  reservation?: { bookingReference: string }; 
  reason?: string; 
  refundAmount?: number; 
  cancellationFee?: number; 
  cancellationDate?: string; 
}
interface PaymentSummaryRow { method: string; total: string | number; count: string | number; }

export function ReportsPage() {
  const [fromDate, setFromDate] = useState(todayMinus(30));
  const [toDate, setToDate] = useState(todayMinus(0));
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyRow[]>([]);
  const [cancellations, setCancellations] = useState<CancellationRow[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rev, occ, canc, pay] = await Promise.all([
        reportsService.revenue(fromDate, toDate),
        reportsService.occupancy(fromDate, toDate),
        reportsService.cancellations(fromDate, toDate),
        reportsService.paymentSummary(fromDate, toDate),
      ]);
      setRevenue(rev.data || []);
      setOccupancy(occ.data || []);
      setCancellations(canc.data || []);
      setPaymentSummary(pay.data || []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function exportRevenueCsv() {
    const rows = ['date,revenue', ...revenue.map((r) => `${r.date},${r.total}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportOccupancyCsv() {
    const rows = ['date,rooms_booked,occupancy_rate_percent', ...occupancy.map((o) => `${o.date},${o.roomsBooked},${o.occupancyRate}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `occupancy-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCancellationsCsv() {
    const rows = ['reservation_ref,reason,refund_amount,fee,date', ...cancellations.map((c) => `"${c.reservation?.bookingReference || ''}","${c.reason || ''}",${c.refundAmount},${c.cancellationFee},${c.cancellationDate}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cancellations-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const revenueData = revenue.map((r) => ({
    date: new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    total: Number(r.total),
  }));

  const occupancyData = occupancy.map((o) => ({
    date: new Date(o.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    occupancyRate: Number(o.occupancyRate),
  }));

  const hasRevenueData = revenueData.length > 0 && revenueData.some((r) => r.total > 0);
  const hasOccupancyData = occupancyData.length > 0 && occupancyData.some((o) => o.occupancyRate > 0);
  const hasPayments = paymentSummary.length > 0;
  const hasCancellations = cancellations.length > 0;
  const hasAnyData = hasRevenueData || hasOccupancyData || hasPayments || hasCancellations;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Revenue, occupancy, cancellations and payment breakdowns" />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end flex-wrap">
          <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <SecondaryButton onClick={load}>Apply</SecondaryButton>
          <SecondaryButton onClick={exportRevenueCsv} disabled={!hasRevenueData}>Export Revenue CSV</SecondaryButton>
          <SecondaryButton onClick={exportOccupancyCsv} disabled={!hasOccupancyData}>Export Occupancy CSV</SecondaryButton>
          <SecondaryButton onClick={exportCancellationsCsv} disabled={!hasCancellations}>Export Cancellations CSV</SecondaryButton>
        </div>
      </Card>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && !hasAnyData && (
        <Card className="mb-4 text-center py-10">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h3 className="text-base font-semibold text-slate-700">No report data found</h3>
          <p className="mt-1 text-sm text-slate-500">
            No activity was recorded between <span className="font-medium">{fromDate}</span> and <span className="font-medium">{toDate}</span>. Try selecting a broader date range.
          </p>
        </Card>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="min-w-0">
            <Card className="overflow-hidden">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Daily Revenue</h3>
              <div className="h-64 w-full">
                {hasRevenueData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" tickMargin={8} />
                      <YAxis
                        width={48}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                      />
                      <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartEmptyState label="Daily Revenue" />
                )}
              </div>
            </Card>
          </div>

          <div className="min-w-0">
            <Card className="overflow-hidden">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Occupancy Rate</h3>
              <div className="h-64 w-full">
                {hasOccupancyData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={occupancyData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" tickMargin={8} />
                      <YAxis
                        width={48}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip formatter={(value: any) => [`${value}%`, 'Occupancy']} />
                      <Bar dataKey="occupancyRate" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartEmptyState label="Occupancy Rate" />
                )}
              </div>
            </Card>
          </div>

          <div className="min-w-0">
            <Card className="overflow-hidden">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Payment Method Summary</h3>
              {hasPayments ? (
                <ul className="divide-y divide-slate-100 text-sm">
                  {paymentSummary.map((p, i) => (
                    <li key={i} className="flex justify-between py-2">
                      <span>{p.method}</span>
                      <span className="font-medium">{p.count} payments · ₹{p.total}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-6 text-center text-sm text-slate-400">No payments recorded in this date range.</div>
              )}
            </Card>
          </div>

          <div className="min-w-0">
            <Card className="overflow-hidden">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Cancellations</h3>
              {hasCancellations ? (
                <ul className="divide-y divide-slate-100 text-sm">
                  {cancellations.map((c) => (
                    <li key={c.id} className="py-2">
                      <p className="font-medium">{c.reservation?.bookingReference}</p>
                      <p className="text-xs text-slate-500">{c.reason} · Refund ₹{c.refundAmount}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-6 text-center text-sm text-slate-400">No cancellations recorded in this date range.</div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
