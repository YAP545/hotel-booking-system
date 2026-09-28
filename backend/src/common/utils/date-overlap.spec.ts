import { dateRangesOverlap } from './date-overlap';

describe('dateRangesOverlap (double-booking prevention)', () => {
  it('detects a full overlap', () => {
    expect(dateRangesOverlap('2026-10-01', '2026-10-05', '2026-10-02', '2026-10-04')).toBe(true);
  });

  it('detects a partial overlap at the start', () => {
    expect(dateRangesOverlap('2026-10-01', '2026-10-05', '2026-09-28', '2026-10-02')).toBe(true);
  });

  it('detects a partial overlap at the end', () => {
    expect(dateRangesOverlap('2026-10-01', '2026-10-05', '2026-10-04', '2026-10-10')).toBe(true);
  });

  it('allows back-to-back bookings (checkout day == next checkin day)', () => {
    // Room is free again the same day the previous guest checks out.
    expect(dateRangesOverlap('2026-10-01', '2026-10-05', '2026-10-05', '2026-10-08')).toBe(false);
    expect(dateRangesOverlap('2026-10-05', '2026-10-08', '2026-10-01', '2026-10-05')).toBe(false);
  });

  it('returns false for completely separate ranges', () => {
    expect(dateRangesOverlap('2026-10-01', '2026-10-05', '2026-11-01', '2026-11-05')).toBe(false);
  });

  it('detects when one range fully contains the other', () => {
    expect(dateRangesOverlap('2026-10-01', '2026-10-10', '2026-10-03', '2026-10-05')).toBe(true);
    expect(dateRangesOverlap('2026-10-03', '2026-10-05', '2026-10-01', '2026-10-10')).toBe(true);
  });
});
