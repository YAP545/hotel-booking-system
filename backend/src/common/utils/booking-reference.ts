/**
 * Generates references like HTL-20260926-0001 using a per-day sequence
 * derived from how many reservations already exist for today (passed in).
 */
export function generateBookingReference(todaysCount: number, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const seq = String(todaysCount + 1).padStart(4, '0');
  return `HTL-${y}${m}${d}-${seq}`;
}
