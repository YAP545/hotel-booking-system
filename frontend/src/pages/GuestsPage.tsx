import { useEffect, useState, FormEvent } from 'react';
import { Plus, Search, User, Crown, Award } from 'lucide-react';
import { guestsService } from '../services/guests.service';
import { Guest, GuestDetail } from '../types';
import { Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, PrimaryButton, SecondaryButton } from '../components/ui';
import { Modal } from '../components/Modal';
import { BookingStatusBadge } from '../components/StatusBadges';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/api';

export function GuestsPage() {
  const { show } = useToast();
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await guestsService.list(search || undefined, 1, 50);
      setGuests(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title="Guest Management"
        subtitle="Search guest profiles, loyalty tiers and booking history"
        actions={<PrimaryButton onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Add Guest</PrimaryButton>}
      />

      <Card className="mb-4">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); load(); }} className="flex gap-3">
          <Input placeholder="Search by name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
          <SecondaryButton><Search className="h-4 w-4" /> Search</SecondaryButton>
        </form>
      </Card>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && guests.length === 0 && <EmptyState title="No guests found" />}

      {!loading && !error && guests.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guests.map((g) => (
            <Card key={g.id} className="cursor-pointer hover:border-brand-300" onClick={() => setSelectedGuestId(g.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-slate-900">{g.firstName} {g.lastName}</p>
                      {g.isVip && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          <Crown className="h-3 w-3 text-amber-600" /> VIP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{g.phone}{g.email ? ` · ${g.email}` : ''}</p>
                  </div>
                </div>
                {g.loyaltyTier && g.loyaltyTier !== 'STANDARD' && (
                  <span className="rounded-md bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
                    {g.loyaltyTier}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <GuestFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
      {selectedGuestId && (
        <GuestDetailModal guestId={selectedGuestId} onClose={() => setSelectedGuestId(null)} />
      )}
    </div>
  );
}

function GuestFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { show } = useToast();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', city: '', country: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await guestsService.create(form);
      show('Guest added.', 'success');
      onSaved();
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add Guest" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="Last name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <Input label="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={submitting}>Save Guest</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function GuestDetailModal({ guestId, onClose }: { guestId: string; onClose: () => void }) {
  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    guestsService.get(guestId).then(setGuest).catch((err) => setError(apiErrorMessage(err)));
  }, [guestId]);

  return (
    <Modal title={guest ? `${guest.firstName} ${guest.lastName}` : 'Guest'} onClose={onClose} widthClass="max-w-xl">
      {error && <ErrorState message={error} />}
      {!guest && !error && <LoadingState />}
      {guest && (
        <div>
          <div className="mb-4 grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-slate-500">Phone</span><span className="text-right">{guest.phone}</span>
            <span className="text-slate-500">Email</span><span className="text-right">{guest.email || '—'}</span>
            <span className="text-slate-500">City/Country</span><span className="text-right">{[guest.city, guest.country].filter(Boolean).join(', ') || '—'}</span>
            <span className="text-slate-500">ID Proof</span><span className="text-right">{guest.idProofType ? `${guest.idProofType} · ${guest.idProofNumber}` : '—'}</span>
            <span className="text-slate-500">Loyalty Tier</span>
            <span className="text-right font-medium text-purple-700">{guest.loyaltyTier || 'STANDARD'} {guest.isVip ? '👑 (VIP)' : ''}</span>
            <span className="text-slate-500">Completed Stays</span>
            <span className="text-right font-medium text-slate-800">{guest.completedStays || 0} stays ({guest.totalNights || 0} nights)</span>
            <span className="font-medium text-slate-700">Total Spent</span>
            <span className="text-right font-semibold text-green-700">₹{guest.totalSpent}</span>
          </div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">Booking History</h4>
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {guest.reservations.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{r.bookingReference}</p>
                  <p className="text-xs text-slate-500">Room {r.room.roomNumber} · {r.checkInDate} → {r.checkOutDate}</p>
                </div>
                <BookingStatusBadge status={r.bookingStatus} />
              </li>
            ))}
            {guest.reservations.length === 0 && <p className="text-sm text-slate-400">No bookings yet.</p>}
          </ul>
        </div>
      )}
    </Modal>
  );
}
