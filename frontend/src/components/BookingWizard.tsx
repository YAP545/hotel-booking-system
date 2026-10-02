import { useState, FormEvent } from 'react';
import { ArrowLeft, ArrowRight, BedDouble, Check, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { Input, PrimaryButton, SecondaryButton } from './ui';
import { roomsService } from '../services/rooms.service';
import { guestsService } from '../services/guests.service';
import { reservationsService } from '../services/reservations.service';
import { AvailableRoom, Guest } from '../types';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/api';

type Step = 'search' | 'select' | 'guest' | 'summary';

export function BookingWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { show } = useToast();
  const [step, setStep] = useState<Step>('search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: search criteria
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guestsCount, setGuestsCount] = useState('2');

  // Step 2: results + selection
  const [results, setResults] = useState<AvailableRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);

  // Step 3: guest
  const [guestMode, setGuestMode] = useState<'search' | 'new'>('search');
  const [guestSearch, setGuestSearch] = useState('');
  const [guestResults, setGuestResults] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [newGuest, setNewGuest] = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [specialRequests, setSpecialRequests] = useState('');

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const rooms = await roomsService.searchAvailable({
        checkInDate,
        checkOutDate,
        guests: parseInt(guestsCount, 10),
      });
      setResults(rooms);
      setStep('select');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestSearch() {
    if (!guestSearch) return;
    const res = await guestsService.list(guestSearch, 1, 5);
    setGuestResults(res.data);
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      let guestId = selectedGuest?.id;
      if (guestMode === 'new') {
        const created = await guestsService.create(newGuest);
        guestId = created.data.id;
      }
      if (!guestId || !selectedRoom) throw new Error('Missing guest or room selection.');

      await reservationsService.create({
        guestId,
        roomId: selectedRoom.id,
        checkInDate,
        checkOutDate,
        numberOfGuests: parseInt(guestsCount, 10),
        specialRequests: specialRequests || undefined,
      });
      show('Reservation created successfully.', 'success');
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const canProceedToGuest = !!selectedRoom;
  const canProceedToSummary =
    (guestMode === 'search' && !!selectedGuest) ||
    (guestMode === 'new' && newGuest.firstName && newGuest.lastName && newGuest.phone);

  return (
    <Modal title="New Reservation" onClose={onClose} widthClass="max-w-2xl">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-400">
        {['Search', 'Select Room', 'Guest Details', 'Confirm'].map((label, i) => {
          const stepKeys: Step[] = ['search', 'select', 'guest', 'summary'];
          const active = stepKeys.indexOf(step) >= i;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}
              >
                {i + 1}
              </span>
              <span className={active ? 'text-slate-700' : ''}>{label}</span>
              {i < 3 && <span className="mx-1 h-px w-6 bg-slate-200" />}
            </div>
          );
        })}
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {step === 'search' && (
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Check-in date"
              type="date"
              required
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
            />
            <Input
              label="Check-out date"
              type="date"
              required
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
            />
          </div>
          <Input
            label="Number of guests"
            type="number"
            min={1}
            required
            value={guestsCount}
            onChange={(e) => setGuestsCount(e.target.value)}
          />
          <div className="flex justify-end pt-2">
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Search Availability
            </PrimaryButton>
          </div>
        </form>
      )}

      {step === 'select' && (
        <div>
          {results.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No rooms available for the selected dates. Try a different date range.
            </p>
          )}
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {results.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                  selectedRoom?.id === room.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BedDouble className="h-5 w-5 text-brand-600" />
                  <div>
                    <p className="font-medium text-slate-900">
                      Room {room.roomNumber} — {room.roomType.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Capacity {room.roomType.capacity} · {room.roomType.amenities?.join(', ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">₹{room.pricePerNight}/night</p>
                  <p className="text-xs text-slate-500">
                    {room.nights} nights · ₹{room.estimatedSubtotal}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <SecondaryButton onClick={() => setStep('search')}>
              <ArrowLeft className="h-4 w-4" /> Back
            </SecondaryButton>
            <PrimaryButton onClick={() => setStep('guest')} disabled={!canProceedToGuest}>
              Next <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === 'guest' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setGuestMode('search')}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${guestMode === 'search' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}
            >
              Existing Guest
            </button>
            <button
              onClick={() => setGuestMode('new')}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${guestMode === 'new' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}
            >
              New Guest
            </button>
          </div>

          {guestMode === 'search' ? (
            <div>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name, email or phone"
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="flex-1"
                />
                <SecondaryButton onClick={handleGuestSearch}>Search</SecondaryButton>
              </div>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {guestResults.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGuest(g)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm ${selectedGuest?.id === g.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <span>
                      {g.firstName} {g.lastName} · {g.phone}
                    </span>
                    {selectedGuest?.id === g.id && <Check className="h-4 w-4 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First name"
                required
                value={newGuest.firstName}
                onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
              />
              <Input
                label="Last name"
                required
                value={newGuest.lastName}
                onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
              />
              <Input
                label="Phone"
                required
                value={newGuest.phone}
                onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={newGuest.email}
                onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
              />
            </div>
          )}

          <Input
            label="Special requests (optional)"
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
          />

          <div className="flex justify-between pt-2">
            <SecondaryButton onClick={() => setStep('select')}>
              <ArrowLeft className="h-4 w-4" /> Back
            </SecondaryButton>
            <PrimaryButton onClick={() => setStep('summary')} disabled={!canProceedToSummary}>
              Next <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === 'summary' && selectedRoom && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-4 text-sm">
            <p className="mb-2 font-semibold text-slate-800">Booking Summary</p>
            <div className="grid grid-cols-2 gap-y-1 text-slate-600">
              <span>Guest</span>
              <span className="text-right font-medium text-slate-900">
                {guestMode === 'new'
                  ? `${newGuest.firstName} ${newGuest.lastName}`
                  : `${selectedGuest?.firstName} ${selectedGuest?.lastName}`}
              </span>
              <span>Room</span>
              <span className="text-right font-medium text-slate-900">
                {selectedRoom.roomNumber} — {selectedRoom.roomType.name}
              </span>
              <span>Check-in</span>
              <span className="text-right">{checkInDate}</span>
              <span>Check-out</span>
              <span className="text-right">{checkOutDate}</span>
              <span>Nights</span>
              <span className="text-right">{selectedRoom.nights}</span>
              <span>Price/night</span>
              <span className="text-right">₹{selectedRoom.pricePerNight}</span>
              <span className="mt-2 border-t pt-2 font-semibold text-slate-800">Estimated Subtotal</span>
              <span className="mt-2 border-t pt-2 text-right font-semibold text-slate-900">
                ₹{selectedRoom.estimatedSubtotal}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Final tax and total are calculated by the server upon confirmation.
            </p>
          </div>

          <div className="flex justify-between pt-2">
            <SecondaryButton onClick={() => setStep('guest')}>
              <ArrowLeft className="h-4 w-4" /> Back
            </SecondaryButton>
            <PrimaryButton onClick={handleConfirm} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirm Reservation
            </PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
