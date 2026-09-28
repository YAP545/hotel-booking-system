import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../../users/user.entity';
import { RoomType } from '../../room-types/room-type.entity';
import { Room } from '../../rooms/room.entity';
import { Guest } from '../../guests/guest.entity';
import { Reservation } from '../../reservations/reservation.entity';
import { Payment } from '../../payments/payment.entity';
import { HotelSettings } from '../../settings/hotel-settings.entity';
import { UserRole, RoomStatus, BookingStatus, PaymentMethod, PaymentStatus } from '../../common/enums';
import { generateBookingReference } from '../../common/utils/booking-reference';

const DEMO_PASSWORD = 'Demo@1234';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected. Seeding...');

  const userRepo = AppDataSource.getRepository(User);
  const roomTypeRepo = AppDataSource.getRepository(RoomType);
  const roomRepo = AppDataSource.getRepository(Room);
  const guestRepo = AppDataSource.getRepository(Guest);
  const reservationRepo = AppDataSource.getRepository(Reservation);
  const paymentRepo = AppDataSource.getRepository(Payment);
  const settingsRepo = AppDataSource.getRepository(HotelSettings);

  // --- Settings ---
  const settingsCount = await settingsRepo.count();
  if (settingsCount === 0) {
    await settingsRepo.save(settingsRepo.create({ id: 1 }));
  }
  const settings = await settingsRepo.findOneByOrFail({ id: 1 });

  // --- Demo users ---
  const demoUsers = [
    { name: 'Hotel Admin', email: 'admin@hotel.com', role: UserRole.ADMIN },
    { name: 'Front Desk Receptionist', email: 'reception@hotel.com', role: UserRole.RECEPTIONIST },
  ];
  for (const u of demoUsers) {
    const existing = await userRepo.findOne({ where: { email: u.email } });
    if (!existing) {
      await userRepo.save(
        userRepo.create({
          name: u.name,
          email: u.email,
          role: u.role,
          passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
          phone: '9999999999',
        }),
      );
      console.log(`Created user ${u.email}`);
    }
  }
  const receptionist = await userRepo.findOneByOrFail({ email: 'reception@hotel.com' });

  // --- Room types ---
  const roomTypeDefs = [
    { name: 'Standard', capacity: 2, basePrice: 2500, amenities: ['WiFi', 'TV', 'AC'], count: 8 },
    { name: 'Deluxe', capacity: 3, basePrice: 4000, amenities: ['WiFi', 'TV', 'AC', 'Mini Bar'], count: 6 },
    { name: 'Suite', capacity: 4, basePrice: 7000, amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Lounge Access'], count: 4 },
    { name: 'Family', capacity: 5, basePrice: 6000, amenities: ['WiFi', 'TV', 'AC', 'Extra Beds'], count: 2 },
  ];

  const roomTypes: Record<string, RoomType> = {};
  for (const def of roomTypeDefs) {
    let rt = await roomTypeRepo.findOne({ where: { name: def.name } });
    if (!rt) {
      rt = await roomTypeRepo.save(
        roomTypeRepo.create({
          name: def.name,
          description: `${def.name} room with modern amenities.`,
          capacity: def.capacity,
          basePrice: def.basePrice,
          amenities: def.amenities,
        }),
      );
      console.log(`Created room type ${def.name}`);
    }
    roomTypes[def.name] = rt;
  }

  // --- Rooms (20 total: 8 Standard, 6 Deluxe, 4 Suite, 2 Family) ---
  const existingRoomsCount = await roomRepo.count();
  const rooms: Room[] = [];
  if (existingRoomsCount === 0) {
    let roomNumberCounter = 101;
    for (const def of roomTypeDefs) {
      for (let i = 0; i < def.count; i++) {
        const floor = Math.floor((roomNumberCounter - 100) / 10) + 1;
        const room = roomRepo.create({
          roomNumber: String(roomNumberCounter),
          roomTypeId: roomTypes[def.name].id,
          floor,
          status: RoomStatus.AVAILABLE,
        });
        rooms.push(await roomRepo.save(room));
        roomNumberCounter++;
      }
    }
    console.log(`Created ${rooms.length} rooms`);
  } else {
    rooms.push(...(await roomRepo.find()));
  }

  // --- Guests (15) ---
  const guestNames = [
    ['Aarav', 'Sharma'], ['Vivaan', 'Patel'], ['Aditya', 'Reddy'], ['Vihaan', 'Iyer'],
    ['Arjun', 'Nair'], ['Sai', 'Rao'], ['Ananya', 'Gupta'], ['Diya', 'Menon'],
    ['Ishaan', 'Verma'], ['Kavya', 'Joshi'], ['Aryan', 'Kulkarni'], ['Meera', 'Desai'],
    ['Rohan', 'Kapoor'], ['Priya', 'Bhat'], ['Kabir', 'Chauhan'],
  ];
  const existingGuestCount = await guestRepo.count();
  const guests: Guest[] = [];
  if (existingGuestCount === 0) {
    for (let i = 0; i < guestNames.length; i++) {
      const [firstName, lastName] = guestNames[i];
      const guest = guestRepo.create({
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: `98${String(10000000 + i * 1234).padStart(8, '0')}`,
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        idProofType: 'Aadhar',
        idProofNumber: `AADH${1000 + i}`,
      });
      guests.push(await guestRepo.save(guest));
    }
    console.log(`Created ${guests.length} guests`);
  } else {
    guests.push(...(await guestRepo.find()));
  }

  // --- Reservations (20), spread across past/current/future, varied statuses ---
  const existingReservationCount = await reservationRepo.count();
  if (existingReservationCount === 0) {
    const today = new Date();
    // Plan: mix of statuses across a spread of dates, one reservation per distinct
    // room+date-range to respect the no-overlap business rule even in seed data.
    const plan: { offsetStart: number; nights: number; status: BookingStatus }[] = [
      { offsetStart: -20, nights: 3, status: BookingStatus.CHECKED_OUT },
      { offsetStart: -18, nights: 2, status: BookingStatus.CHECKED_OUT },
      { offsetStart: -15, nights: 4, status: BookingStatus.CHECKED_OUT },
      { offsetStart: -12, nights: 2, status: BookingStatus.CHECKED_OUT },
      { offsetStart: -10, nights: 3, status: BookingStatus.CHECKED_OUT },
      { offsetStart: -8, nights: 2, status: BookingStatus.CHECKED_OUT },
      { offsetStart: -6, nights: 3, status: BookingStatus.CHECKED_OUT },
      { offsetStart: -5, nights: 2, status: BookingStatus.CANCELLED },
      { offsetStart: -3, nights: 5, status: BookingStatus.CHECKED_IN },
      { offsetStart: -2, nights: 3, status: BookingStatus.CHECKED_IN },
      { offsetStart: -1, nights: 2, status: BookingStatus.CHECKED_IN },
      { offsetStart: 0, nights: 3, status: BookingStatus.CHECKED_IN },
      { offsetStart: 0, nights: 2, status: BookingStatus.CONFIRMED },
      { offsetStart: 1, nights: 2, status: BookingStatus.CONFIRMED },
      { offsetStart: 2, nights: 3, status: BookingStatus.CONFIRMED },
      { offsetStart: 3, nights: 2, status: BookingStatus.CONFIRMED },
      { offsetStart: 5, nights: 4, status: BookingStatus.CONFIRMED },
      { offsetStart: 7, nights: 2, status: BookingStatus.CONFIRMED },
      { offsetStart: 10, nights: 3, status: BookingStatus.CONFIRMED },
      { offsetStart: 15, nights: 2, status: BookingStatus.CANCELLED },
    ];

    let seq = 1;
    for (let i = 0; i < plan.length; i++) {
      const p = plan[i];
      const room = rooms[i % rooms.length];
      const roomType = roomTypes[roomTypeDefs.find((d) => roomTypes[d.name].id === room.roomTypeId)!.name];
      const guest = guests[i % guests.length];

      const checkIn = addDays(today, p.offsetStart);
      const checkOut = addDays(checkIn, p.nights);
      const pricePerNight = Number(room.price ?? roomType.basePrice);
      const subtotal = Number((pricePerNight * p.nights).toFixed(2));
      const tax = Number(((subtotal * Number(settings.taxPercent)) / 100).toFixed(2));
      const totalAmount = Number((subtotal + tax).toFixed(2));

      const reservation = reservationRepo.create({
        bookingReference: generateBookingReference(seq - 1, checkIn),
        guestId: guest.id,
        roomId: room.id,
        checkInDate: toDateStr(checkIn),
        checkOutDate: toDateStr(checkOut),
        numberOfGuests: Math.min(2, roomType.capacity),
        bookingStatus: p.status,
        subtotal,
        tax,
        discount: 0,
        totalAmount,
      });
      const saved = await reservationRepo.save(reservation);
      seq++;

      // Payments: fully paid for checked-out, partially paid for checked-in,
      // unpaid for confirmed (future), none for cancelled.
      if (p.status === BookingStatus.CHECKED_OUT || p.status === BookingStatus.CHECKED_IN) {
        await paymentRepo.save(
          paymentRepo.create({
            reservationId: saved.id,
            amount: p.status === BookingStatus.CHECKED_OUT ? totalAmount : Number((totalAmount * 0.5).toFixed(2)),
            paymentMethod: i % 2 === 0 ? PaymentMethod.CARD : PaymentMethod.UPI,
            paymentStatus: p.status === BookingStatus.CHECKED_OUT ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
            transactionReference: `TXN${100000 + i}`,
            paidAt: checkIn,
          }),
        );
      }

      // Reflect current physical room status for "today"-relevant bookings.
      if (p.status === BookingStatus.CHECKED_IN) {
        room.status = RoomStatus.OCCUPIED;
        await roomRepo.save(room);
      } else if (p.status === BookingStatus.CONFIRMED && toDateStr(checkIn) <= toDateStr(today)) {
        room.status = RoomStatus.RESERVED;
        await roomRepo.save(room);
      } else if (p.status === BookingStatus.CHECKED_OUT && room.status === RoomStatus.AVAILABLE) {
        // leave as AVAILABLE; cleaning cycle already completed for seed purposes
      }
    }
    console.log(`Created ${plan.length} reservations with payments`);
  }

  console.log('\nSeed complete.');
  console.log('Demo credentials:');
  console.log(`  Admin:        admin@hotel.com / ${DEMO_PASSWORD}`);
  console.log(`  Receptionist: reception@hotel.com / ${DEMO_PASSWORD}`);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
