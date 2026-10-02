import { useState, useEffect, DragEvent, useCallback } from 'react';
import { reservationsService } from '../services/reservations.service';
import { roomsService } from '../services/rooms.service';
import { Card, LoadingState, ErrorState } from './ui';
import { useToast } from '../context/ToastContext';
import { BookingStatusBadge } from './StatusBadges';
import { Room, Reservation } from '../types';

function getDaysArray(startDateStr: string, numDays: number) {
  const dates: string[] = [];
  const start = new Date(startDateStr);
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function ReservationTimeline() {
  const toast = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedReservation, setDraggedReservation] = useState<Reservation | null>(null);

  const startDate = new Date().toISOString().slice(0, 10);
  const days = getDaysArray(startDate, 14);

  const loadData = useCallback(async () => {
    try {
      const [roomsRes, resRes] = await Promise.all([
        roomsService.list({ limit: 50 }),
        reservationsService.list({ limit: 50 }),
      ]);
      setRooms(roomsRes.data);
      setReservations(resRes.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  function handleDragStart(resItem: Reservation) {
    setDraggedReservation(resItem);
  }

  async function handleDropOnRoom(targetRoomId: string) {
    if (!draggedReservation || draggedReservation.roomId === targetRoomId) return;

    try {
      await reservationsService.update(draggedReservation.id, {
        roomId: targetRoomId,
      });
      toast.show(`Reservation ${draggedReservation.bookingReference} moved to room successfully.`, 'success');
      await loadData();
    } catch (err: any) {
      toast.show(
        err?.response?.data?.message || err?.message || 'Failed to reassign room. Double-booking prevented.',
        'error',
      );
    } finally {
      setDraggedReservation(null);
    }
  }

  if (loading) return <LoadingState label="Loading reservation timeline..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <Card className="space-y-4 overflow-x-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Drag-and-Drop Reservation Timeline</h3>
          <p className="text-xs text-slate-500">
            Drag a reservation block to another room row to re-assign. Availability is re-validated automatically.
          </p>
        </div>
      </div>

      <div className="min-w-[900px]">
        {/* Timeline Header Row */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
          <div className="w-36 flex-shrink-0 p-3">Room</div>
          <div className="flex flex-1">
            {days.map((d) => (
              <div key={d} className="flex-1 text-center border-l border-slate-200 p-2">
                {d.slice(5)}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Room Rows */}
        <div className="divide-y divide-slate-100">
          {rooms.map((room) => {
            const roomReservations = reservations.filter(
              (r) => r.roomId === room.id && r.bookingStatus !== 'CANCELLED',
            );

            return (
              <div
                key={room.id}
                onDragOver={(e: DragEvent) => e.preventDefault()}
                onDrop={() => handleDropOnRoom(room.id)}
                className="flex items-center hover:bg-slate-50/80 transition-colors"
              >
                <div className="w-36 flex-shrink-0 p-3">
                  <div className="font-bold text-slate-800 text-sm">Room {room.roomNumber}</div>
                  <div className="text-xs text-slate-500">{room.roomType?.name}</div>
                </div>

                <div className="relative flex flex-1 h-14 border-l border-slate-200 items-center">
                  {roomReservations.map((resItem) => (
                    <div
                      key={resItem.id}
                      draggable
                      onDragStart={() => handleDragStart(resItem)}
                      className="cursor-grab active:cursor-grabbing rounded-md border border-brand-300 bg-brand-50 p-1.5 shadow-sm hover:shadow-md text-xs transition-all mx-1"
                    >
                      <div className="font-semibold text-brand-900">
                        {resItem.bookingReference} ({resItem.guest?.lastName || 'Guest'})
                      </div>
                      <div className="mt-1">
                        <BookingStatusBadge status={resItem.bookingStatus} />
                      </div>
                    </div>
                  ))}
                  {roomReservations.length === 0 && <div className="text-xs text-slate-300 px-3 italic">Available</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
