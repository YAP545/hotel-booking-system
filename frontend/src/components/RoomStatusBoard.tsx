import { useState, useEffect, useCallback } from 'react';
import { roomsService } from '../services/rooms.service';
import { RoomStatusBadge } from './StatusBadges';
import { useSocket } from '../hooks/useSocket';
import { Card, LoadingState, ErrorState } from './ui';
import { Radio } from 'lucide-react';
import { Room } from '../types';

const statusBgColors: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100',
  RESERVED: 'bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100',
  OCCUPIED: 'bg-indigo-50 border-indigo-300 text-indigo-900 hover:bg-indigo-100',
  CLEANING: 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100',
  MAINTENANCE: 'bg-orange-50 border-orange-300 text-orange-900 hover:bg-orange-100',
  OUT_OF_SERVICE: 'bg-rose-50 border-rose-300 text-rose-900 hover:bg-rose-100',
};

export function RoomStatusBoard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLiveEvent, setLastLiveEvent] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    try {
      const res = await roomsService.list({ limit: 100 });
      setRooms(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRooms();
  }, [loadRooms]);

  useSocket({
    'room.status_changed': (data: { roomId: string; roomNumber: string; status: import('../types').RoomStatus }) => {
      setRooms((prevRooms) =>
        prevRooms.map((room) => (room.id === data.roomId ? { ...room, status: data.status } : room)),
      );
      setLastLiveEvent(`Room ${data.roomNumber} status updated to ${data.status}`);
      setTimeout(() => setLastLiveEvent(null), 4000);
    },
    'checkin.completed': () => loadRooms(),
    'checkout.completed': () => loadRooms(),
  });

  if (loading) return <LoadingState label="Loading room status board..." />;
  if (error) return <ErrorState message={error} />;

  // Group rooms by floor
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Front-Desk Live Room Status Board</h2>
          <p className="text-xs text-slate-500">
            Real-time visual map of all rooms across floors. Updates automatically via WebSockets.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
          <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
          Live WebSocket Feed Connected
        </div>
      </div>

      {lastLiveEvent && (
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-xs font-medium text-indigo-800 transition-all">
          ⚡ {lastLiveEvent}
        </div>
      )}

      {floors.map((floor) => {
        const floorRooms = rooms.filter((r) => r.floor === floor);
        return (
          <Card key={floor} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Floor {floor}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {floorRooms.map((room) => (
                <div
                  key={room.id}
                  className={`flex flex-col justify-between rounded-xl border p-3 transition-all duration-300 ${
                    statusBgColors[room.status] || 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">Room {room.roomNumber}</span>
                  </div>
                  <div className="mt-2 text-xs font-medium opacity-85">{room.roomType?.name || 'Standard'}</div>
                  <div className="mt-3">
                    <RoomStatusBadge status={room.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
