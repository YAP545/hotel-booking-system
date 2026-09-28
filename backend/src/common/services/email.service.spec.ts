import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    service = new EmailService();
  });

  it('dispatches booking confirmation notification', async () => {
    const reservation = {
      bookingReference: 'HTL-20260928-0001',
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-05',
      totalAmount: 500,
      guest: { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
    };
    const result = await service.sendBookingConfirmation(reservation);
    expect(result.sent).toBe(true);
    expect(result.recipient).toBe('alice@example.com');
  });

  it('dispatches check-in welcome notification', async () => {
    const reservation = {
      bookingReference: 'HTL-20260928-0001',
      guest: { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
    };
    const result = await service.sendCheckInWelcome(reservation, '101');
    expect(result.sent).toBe(true);
    expect(result.type).toBe('CHECK_IN_WELCOME');
  });
});
