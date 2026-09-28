import { generateBookingReference } from './booking-reference';

describe('generateBookingReference', () => {
  it('formats as HTL-YYYYMMDD-#### with a 4-digit zero-padded sequence', () => {
    const date = new Date(2026, 8, 26); // Sept 26, 2026 (month is 0-indexed)
    expect(generateBookingReference(0, date)).toBe('HTL-20260926-0001');
    expect(generateBookingReference(4, date)).toBe('HTL-20260926-0005');
    expect(generateBookingReference(999, date)).toBe('HTL-20260926-1000');
  });

  it('pads single-digit day and month', () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026
    expect(generateBookingReference(0, date)).toBe('HTL-20260105-0001');
  });
});
