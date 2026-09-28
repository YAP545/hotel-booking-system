import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoomsPage } from './pages/RoomsPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { ReservationDetailPage } from './pages/ReservationDetailPage';
import { GuestsPage } from './pages/GuestsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { MyBookingsPage } from './pages/MyBookingsPage';

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/reservations" element={<ReservationsPage />} />
                <Route path="/reservations/:id" element={<ReservationDetailPage />} />
                <Route path="/guests" element={<GuestsPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/my-bookings" element={<MyBookingsPage />} />

                <Route element={<ProtectedRoute roles={['ADMIN', 'RECEPTIONIST']} />}>
                  <Route path="/reports" element={<ReportsPage />} />
                </Route>

                <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                  <Route path="/audit-log" element={<AuditLogPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
