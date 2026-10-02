import { useEffect, useState, FormEvent, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, BedDouble, LayoutGrid, MapPin } from 'lucide-react';
import { roomsService, roomTypesService } from '../services/rooms.service';
import { Room, RoomStatus, RoomType } from '../types';
import {
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  PrimaryButton,
  Select,
  SecondaryButton,
} from '../components/ui';
import { RoomStatusBadge } from '../components/StatusBadges';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RoomStatusBoard } from '../components/RoomStatusBoard';

const STATUS_OPTIONS: RoomStatus[] = ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE'];

export function RoomsPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roomNumber, setRoomNumber] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'board'>('grid');

  const isAdmin = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsRes, typesRes] = await Promise.all([
        roomsService.list({
          roomNumber: roomNumber || undefined,
          status: (statusFilter as RoomStatus) || undefined,
          roomTypeId: typeFilter || undefined,
          limit: 100,
        }),
        roomTypesService.list(),
      ]);
      setRooms(roomsRes.data);
      setRoomTypes(typesRes);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [roomNumber, statusFilter, typeFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- safe: async fetch triggered by dropdown filter change, no infinite loop
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only refetch on dropdown filter change; roomNumber applied via form submit, not on every keystroke
  }, [statusFilter, typeFilter]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    load();
  }

  async function handleDelete(room: Room) {
    if (!confirm(`Deactivate/delete room ${room.roomNumber}?`)) return;
    try {
      await roomsService.remove(room.id);
      show(`Room ${room.roomNumber} removed.`, 'success');
      load();
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Room Management"
        subtitle="View, filter, and manage all hotel rooms"
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Room Grid
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="h-3.5 w-3.5 text-brand-600" /> Live Status Board
              </button>
            </div>
            {isAdmin && (
              <PrimaryButton
                onClick={() => {
                  setEditingRoom(null);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add Room
              </PrimaryButton>
            )}
          </div>
        }
      />

      {viewMode === 'board' ? (
        <RoomStatusBoard />
      ) : (
        <>
          <Card className="mb-4">
            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  label="Room number"
                  placeholder="e.g. 204"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-full sm:w-48">
                <Select label="Room type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">All types</option>
                  {roomTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
              <SecondaryButton>
                <Search className="h-4 w-4" /> Search
              </SecondaryButton>
            </form>
          </Card>

          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && rooms.length === 0 && (
            <EmptyState title="No rooms found" description="Try adjusting your filters, or add a new room." />
          )}

          {!loading && !error && rooms.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rooms.map((room) => (
                <Card key={room.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-5 w-5 text-brand-600" />
                      <div>
                        <p className="font-semibold text-slate-900">Room {room.roomNumber}</p>
                        <p className="text-xs text-slate-500">Floor {room.floor}</p>
                      </div>
                    </div>
                    <RoomStatusBadge status={room.status} />
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="font-medium text-slate-800">{room.roomType?.name}</p>
                    <p>Capacity: {room.roomType?.capacity} guests</p>
                    <p>₹{room.price ?? room.roomType?.basePrice} / night</p>
                    {room.roomType?.amenities && (
                      <p className="mt-1 text-xs text-slate-500">{room.roomType.amenities.join(' · ')}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="mt-auto flex gap-2 pt-2">
                      <SecondaryButton
                        onClick={() => {
                          setEditingRoom(room);
                          setShowForm(true);
                        }}
                        className="flex-1"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </SecondaryButton>
                      <SecondaryButton
                        onClick={() => handleDelete(room)}
                        className="flex-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </SecondaryButton>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <RoomFormModal
          room={editingRoom}
          roomTypes={roomTypes}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function RoomFormModal({
  room,
  roomTypes,

  onClose,
  onSaved,
}: {
  room: Room | null;
  roomTypes: RoomType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [roomNumber, setRoomNumber] = useState(room?.roomNumber || '');
  const [roomTypeId, setRoomTypeId] = useState(room?.roomTypeId || roomTypes[0]?.id || '');
  const [floor, setFloor] = useState(room?.floor?.toString() || '1');
  const [price, setPrice] = useState(room?.price?.toString() || '');
  const [status, setStatus] = useState<RoomStatus>(room?.status || 'AVAILABLE');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (room) {
        await roomsService.update(room.id, {
          roomNumber,
          roomTypeId,
          floor: parseInt(floor, 10),
          price: price ? parseFloat(price) : undefined,
          status,
        });
        show('Room updated.', 'success');
      } else {
        await roomsService.create({
          roomNumber,
          roomTypeId,
          floor: parseInt(floor, 10),
          price: price ? parseFloat(price) : undefined,
        });
        show('Room created.', 'success');
      }
      onSaved();
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={room ? `Edit Room ${room.roomNumber}` : 'Add Room'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Room number" required value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
        <Select label="Room type" required value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}>
          {roomTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (₹{t.basePrice}/night)
            </option>
          ))}
        </Select>
        <Input label="Floor" type="number" required value={floor} onChange={(e) => setFloor(e.target.value)} />
        <Input
          label="Price override (optional)"
          type="number"
          placeholder="Leave blank to use room type's base price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        {room && (
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as RoomStatus)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {room ? 'Save changes' : 'Create room'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
