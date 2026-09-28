import { DynamicPricingService } from './dynamic-pricing.service';

describe('DynamicPricingService', () => {
  let service: DynamicPricingService;

  beforeEach(() => {
    service = new DynamicPricingService();
  });

  it('calculates standard rate for weekday stay with low occupancy', () => {
    // Mon 2026-10-05 to Wed 2026-10-07 (2 nights)
    const result = service.calculatePrice(100, '2026-10-05', '2026-10-07', 30);
    expect(result.nights).toBe(2);
    expect(result.occupancyMultiplier).toBe(1.0);
    expect(result.hasWeekendSurge).toBe(false);
    expect(result.subtotal).toBe(200);
  });

  it('applies 20% surge when occupancy >= 80%', () => {
    const result = service.calculatePrice(100, '2026-10-05', '2026-10-07', 85);
    expect(result.occupancyMultiplier).toBe(1.20);
    expect(result.subtotal).toBe(240);
  });

  it('applies weekend surge for Friday/Saturday stay', () => {
    // Fri 2026-10-09 to Sun 2026-10-11 (2 nights: Fri & Sat)
    const result = service.calculatePrice(100, '2026-10-09', '2026-10-11', 0);
    expect(result.hasWeekendSurge).toBe(true);
    // Each night: 100 * 1.15 = 115 => 2 nights = 230
    expect(result.subtotal).toBe(230);
  });

  it('generates a signed quote token and verifies quote when occupancy changes', () => {
    // 1. Initial search at 30% occupancy
    const quoteResult = service.calculatePrice(100, '2026-10-05', '2026-10-07', 30, 'room-uuid-1');
    expect(quoteResult.subtotal).toBe(200);
    expect(quoteResult.quoteToken).toBeDefined();

    // 2. Verify quote token returns exact quoted subtotal (200)
    const verified = service.verifyQuoteToken(quoteResult.quoteToken!);
    expect(verified).not.toBeNull();
    expect(verified?.subtotal).toBe(200);
    expect(verified?.roomId).toBe('room-uuid-1');

    // 3. Current live price at 90% occupancy is now $240, but signed quote retains $200
    const surgeResult = service.calculatePrice(100, '2026-10-05', '2026-10-07', 90, 'room-uuid-1');
    expect(surgeResult.subtotal).toBe(240);
  });
});
