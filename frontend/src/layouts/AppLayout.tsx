import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  CalendarRange,
  BedDouble,
  Users,
  LogOut as LogOutIcon,
  CreditCard,
  FileText,
  BarChart3,
  UserCog,
  Settings as SettingsIcon,
  Menu,
  X,
  Building2,
  ChevronDown,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

interface NavItem {
  label: string;
  to: string;
  icon: JSX.Element;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'My Bookings', to: '/my-bookings', icon: <CalendarRange className="h-5 w-5" />, roles: ['CUSTOMER'] },
  {
    label: 'Reservations',
    to: '/reservations',
    icon: <CalendarRange className="h-5 w-5" />,
    roles: ['ADMIN', 'RECEPTIONIST'],
  },
  { label: 'Rooms', to: '/rooms', icon: <BedDouble className="h-5 w-5" /> },
  { label: 'Guests', to: '/guests', icon: <Users className="h-5 w-5" />, roles: ['ADMIN', 'RECEPTIONIST'] },
  { label: 'Payments', to: '/payments', icon: <CreditCard className="h-5 w-5" />, roles: ['ADMIN', 'RECEPTIONIST'] },
  { label: 'Invoices', to: '/invoices', icon: <FileText className="h-5 w-5" />, roles: ['ADMIN', 'RECEPTIONIST'] },
  { label: 'Reports', to: '/reports', icon: <BarChart3 className="h-5 w-5" />, roles: ['ADMIN', 'RECEPTIONIST'] },
  { label: 'Audit Logs', to: '/audit-log', icon: <ShieldAlert className="h-5 w-5" />, roles: ['ADMIN'] },
  { label: 'Users', to: '/users', icon: <UserCog className="h-5 w-5" />, roles: ['ADMIN'] },
  { label: 'Settings', to: '/settings', icon: <SettingsIcon className="h-5 w-5" />, roles: ['ADMIN'] },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const visibleItems = navItems.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2 px-5 py-5">
        <Building2 className="h-6 w-6 text-brand-600" />
        <span className="text-lg font-semibold text-slate-900">Grand Hotel</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setDrawerOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">{sidebarContent}</aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button onClick={() => setDrawerOpen(true)} className="rounded-md p-1 text-slate-600 lg:hidden">
            <Menu className="h-6 w-6" />
          </button>
          <div className="hidden text-sm text-slate-500 lg:block">Hotel Booking Management System</div>
          <div className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    setChangePasswordOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <KeyRound className="h-4 w-4" /> Change Password
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <LogOutIcon className="h-4 w-4" /> Log out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>

      {changePasswordOpen && <ChangePasswordModal onClose={() => setChangePasswordOpen(false)} />}
    </div>
  );
}
