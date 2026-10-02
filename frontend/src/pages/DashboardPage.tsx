import { useEffect, useState } from 'react';
import {
  BedDouble,
  DoorOpen,
  DoorClosed,
  CalendarCheck,
  LogIn,
  LogOut,
  Wallet,
  Building2,
  TrendingUp,
  BarChart2,
} from 'lucide-react';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { reportsService } from '../services/misc.service';
import { DashboardData } from '../types';
import { Card, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { BookingStatusBadge } from '../components/StatusBadges';
import { apiErrorMessage } from '../services/api';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];

function KpiCard({ icon, label, value }: { icon: JSX.Element; label: string; value: string | number }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reportsService
      .dashboard()
      .then(setData)
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label="Loading dashboard..." />;

  const { kpis, charts, recentBookings, upcomingCheckIns, upcomingCheckOuts, pendingPayments } = data;

  const revenueData = (charts.revenueOverTime || []).map((r) => ({
    date: new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    total: Number(r.total),
  }));
  const hasRevenue = revenueData.length > 0 && revenueData.some((r) => r.total > 0);

  const statusData = (charts.bookingStatusDistribution || []).map((s) => ({
    status: s.status,
    count: Number(s.count),
  }));
  const hasStatusData = statusData.length > 0 && statusData.some((s) => s.count > 0);

  const roomTypeData = (charts.roomTypePopularity || []).map((rt) => ({
    roomType: rt.roomType,
    bookings: Number(rt.bookings),
  }));
  const hasRoomTypeData = roomTypeData.length > 0 && roomTypeData.some((rt) => rt.bookings > 0);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live overview of hotel operations" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={<Building2 className="h-5 w-5" />} label="Total Rooms" value={kpis.totalRooms} />
        <KpiCard icon={<DoorOpen className="h-5 w-5" />} label="Available" value={kpis.availableRooms} />
        <KpiCard icon={<BedDouble className="h-5 w-5" />} label="Occupied" value={kpis.occupiedRooms} />
        <KpiCard icon={<DoorClosed className="h-5 w-5" />} label="Reserved" value={kpis.reservedRooms} />
        <KpiCard icon={<LogIn className="h-5 w-5" />} label="Today's Check-ins" value={kpis.todaysCheckIns} />
        <KpiCard icon={<LogOut className="h-5 w-5" />} label="Today's Check-outs" value={kpis.todaysCheckOuts} />
        <KpiCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Active Reservations"
          value={kpis.activeReservations}
        />
        <KpiCard icon={<Wallet className="h-5 w-5" />} label="Today's Revenue" value={`₹${kpis.todaysRevenue}`} />
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="ADR" value={`₹${kpis.adr ?? 0}`} />
        <KpiCard icon={<BarChart2 className="h-5 w-5" />} label="RevPAR" value={`₹${kpis.revpar ?? 0}`} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <Card className="overflow-hidden">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Revenue (last 14 days)</h3>
            <div className="h-64 w-full">
              {hasRevenue ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" tickMargin={8} />
                    <YAxis
                      width={48}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                    />
                    <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
                    <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No revenue data for the last 14 days
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="min-w-0">
          <Card className="overflow-hidden">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Booking Status Distribution</h3>
            <div className="h-64 w-full">
              {hasStatusData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => entry.status}
                    >
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [v, 'Bookings']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No booking status data available
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="min-w-0">
          <Card className="overflow-hidden">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Room Type Popularity</h3>
            <div className="h-64 w-full">
              {hasRoomTypeData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roomTypeData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="roomType" tick={{ fontSize: 11 }} interval="preserveStartEnd" tickMargin={8} />
                    <YAxis width={48} tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(v: any) => [v, 'Bookings']} />
                    <Bar dataKey="bookings" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No room type popularity data available
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="min-w-0">
          <Card className="overflow-hidden">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Occupancy Rate</h3>
            <div className="flex h-64 flex-col items-center justify-center">
              <p className="text-5xl font-bold text-brand-600">{charts.occupancyRate}%</p>
              <p className="mt-2 text-sm text-slate-500">of rooms currently occupied</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Recent Bookings</h3>
          <ul className="divide-y divide-slate-100">
            {recentBookings.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800">
                    {r.guest.firstName} {r.guest.lastName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.bookingReference} · Room {r.room.roomNumber}
                  </p>
                </div>
                <BookingStatusBadge status={r.bookingStatus} />
              </li>
            ))}
            {recentBookings.length === 0 && <p className="py-4 text-sm text-slate-400">No bookings yet.</p>}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Upcoming Check-ins / Check-outs</h3>
          <div className="space-y-3">
            {upcomingCheckIns.slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  <LogIn className="mr-1 inline h-3.5 w-3.5 text-green-600" /> {r.guest.firstName} {r.guest.lastName} —
                  Room {r.room.roomNumber}
                </span>
                <span className="text-xs text-slate-500">{r.checkInDate}</span>
              </div>
            ))}
            {upcomingCheckOuts.slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  <LogOut className="mr-1 inline h-3.5 w-3.5 text-orange-600" /> {r.guest.firstName} {r.guest.lastName}{' '}
                  — Room {r.room.roomNumber}
                </span>
                <span className="text-xs text-slate-500">{r.checkOutDate}</span>
              </div>
            ))}
            {upcomingCheckIns.length === 0 && upcomingCheckOuts.length === 0 && (
              <p className="text-sm text-slate-400">Nothing scheduled.</p>
            )}
          </div>

          {pendingPayments.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Pending Payments</h3>
              <ul className="space-y-1 text-sm text-slate-600">
                {pendingPayments.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex justify-between">
                    <span>{r.bookingReference}</span>
                    <span className="font-medium text-orange-600">₹{r.totalAmount}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
