import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../reservations/reservation.entity';
import { Room } from '../rooms/room.entity';
import { Payment } from '../payments/payment.entity';
import { Cancellation } from '../cancellations/cancellation.entity';
import { BookingStatus, RoomStatus, PaymentStatus } from '../common/enums';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Reservation) private reservationsRepo: Repository<Reservation>,
    @InjectRepository(Room) private roomsRepo: Repository<Room>,
    @InjectRepository(Payment) private paymentsRepo: Repository<Payment>,
    @InjectRepository(Cancellation) private cancellationsRepo: Repository<Cancellation>,
  ) {}

  /** Dashboard KPI cards + chart series, all derived from live data. */
  async dashboard() {
    const today = new Date().toISOString().slice(0, 10);

    const [totalRooms, available, occupied, reserved] = await Promise.all([
      this.roomsRepo.count({ where: { isActive: true } }),
      this.roomsRepo.count({ where: { status: RoomStatus.AVAILABLE, isActive: true } }),
      this.roomsRepo.count({ where: { status: RoomStatus.OCCUPIED, isActive: true } }),
      this.roomsRepo.count({ where: { status: RoomStatus.RESERVED, isActive: true } }),
    ]);

    const todaysCheckIns = await this.reservationsRepo.count({
      where: { checkInDate: today, bookingStatus: BookingStatus.CONFIRMED },
    });
    const todaysCheckOuts = await this.reservationsRepo.count({
      where: { checkOutDate: today, bookingStatus: BookingStatus.CHECKED_IN },
    });
    const activeReservations = await this.reservationsRepo.count({
      where: [{ bookingStatus: BookingStatus.CONFIRMED }, { bookingStatus: BookingStatus.CHECKED_IN }],
    });

    const { sum: todaysRevenue } = await this.paymentsRepo
      .createQueryBuilder('p')
      .select(
        "COALESCE(SUM(CASE WHEN p.payment_status IN ('PAID', 'PARTIAL') THEN p.amount WHEN p.payment_status = 'REFUNDED' THEN -p.amount ELSE 0 END), 0)",
        'sum',
      )
      .where('DATE(p.paid_at) = :today', { today })
      .getRawOne();

    const { sum: totalRoomRevenue } = await this.paymentsRepo
      .createQueryBuilder('p')
      .select(
        "COALESCE(SUM(CASE WHEN p.payment_status IN ('PAID', 'PARTIAL') THEN p.amount WHEN p.payment_status = 'REFUNDED' THEN -p.amount ELSE 0 END), 0)",
        'sum',
      )
      .getRawOne();

    const occupiedNightsRaw = await this.reservationsRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(DATEDIFF(r.check_out_date, r.check_in_date)), 0)', 'sum')
      .where('r.booking_status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT],
      })
      .getRawOne();

    const roomRev = Number(totalRoomRevenue);
    const totalOccupiedNights = Math.max(Number(occupiedNightsRaw?.sum || 0), 1);
    const adr = Number((roomRev / totalOccupiedNights).toFixed(2));
    const revpar = Number((roomRev / Math.max(totalRooms, 1)).toFixed(2));

    // Revenue over the last 14 days (Net = PAID + PARTIAL - REFUNDED)
    const revenueSeries = await this.paymentsRepo
      .createQueryBuilder('p')
      .select('DATE(p.paid_at)', 'date')
      .addSelect(
        "COALESCE(SUM(CASE WHEN p.payment_status IN ('PAID', 'PARTIAL') THEN p.amount WHEN p.payment_status = 'REFUNDED' THEN -p.amount ELSE 0 END), 0)",
        'total',
      )
      .where('p.paid_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)')
      .groupBy('DATE(p.paid_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const statusDistribution = await this.reservationsRepo
      .createQueryBuilder('r')
      .select('r.booking_status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.booking_status')
      .getRawMany();

    const roomTypePopularity = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoin('r.room', 'room')
      .leftJoin('room.roomType', 'roomType')
      .select('roomType.name', 'roomType')
      .addSelect('COUNT(*)', 'bookings')
      .groupBy('roomType.name')
      .getRawMany();

    const recentBookings = await this.reservationsRepo.find({
      relations: ['guest', 'room'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const upcomingCheckIns = await this.reservationsRepo.find({
      where: { bookingStatus: BookingStatus.CONFIRMED },
      relations: ['guest', 'room'],
      order: { checkInDate: 'ASC' },
      take: 10,
    });

    const upcomingCheckOuts = await this.reservationsRepo.find({
      where: { bookingStatus: BookingStatus.CHECKED_IN },
      relations: ['guest', 'room'],
      order: { checkOutDate: 'ASC' },
      take: 10,
    });

    const pendingPayments = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.guest', 'guest')
      .leftJoin('payments', 'p', 'p.reservation_id = r.id AND p.payment_status IN (:...ps)', {
        ps: [PaymentStatus.PAID, PaymentStatus.PARTIAL],
      })
      .addSelect('COALESCE(SUM(p.amount), 0)', 'paid')
      .where('r.booking_status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
      })
      .groupBy('r.id')
      .having('COALESCE(SUM(p.amount), 0) < r.total_amount')
      .getRawAndEntities();

    return {
      kpis: {
        totalRooms,
        availableRooms: available,
        occupiedRooms: occupied,
        reservedRooms: reserved,
        todaysCheckIns,
        todaysCheckOuts,
        activeReservations,
        todaysRevenue: Number(todaysRevenue),
        adr,
        revpar,
      },
      charts: {
        revenueOverTime: revenueSeries,
        occupancyRate: totalRooms > 0 ? Number(((occupied / totalRooms) * 100).toFixed(1)) : 0,
        bookingStatusDistribution: statusDistribution,
        roomTypePopularity,
      },
      recentBookings,
      upcomingCheckIns,
      upcomingCheckOuts,
      pendingPayments: pendingPayments.entities,
    };
  }

  async revenue(fromDate: string, toDate: string) {
    return this.paymentsRepo
      .createQueryBuilder('p')
      .select('DATE(p.paid_at)', 'date')
      .addSelect(
        "COALESCE(SUM(CASE WHEN p.payment_status IN ('PAID', 'PARTIAL') THEN p.amount WHEN p.payment_status = 'REFUNDED' THEN -p.amount ELSE 0 END), 0)",
        'total',
      )
      .where('DATE(p.paid_at) BETWEEN :fromDate AND :toDate', { fromDate, toDate })
      .groupBy('DATE(p.paid_at)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  async occupancy(fromDate: string, toDate: string) {
    const totalRooms = await this.roomsRepo.count({ where: { isActive: true } });
    const bookedNights = await this.reservationsRepo
      .createQueryBuilder('r')
      .select('r.check_in_date', 'date')
      .addSelect('COUNT(DISTINCT r.room_id)', 'roomsBooked')
      .where('r.booking_status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT],
      })
      .andWhere('r.check_in_date BETWEEN :fromDate AND :toDate', { fromDate, toDate })
      .groupBy('r.check_in_date')
      .orderBy('r.check_in_date', 'ASC')
      .getRawMany();

    return bookedNights.map((row) => ({
      date: row.date,
      roomsBooked: Number(row.roomsBooked),
      occupancyRate: totalRooms > 0 ? Number(((row.roomsBooked / totalRooms) * 100).toFixed(1)) : 0,
    }));
  }

  async bookings(fromDate: string, toDate: string) {
    return this.reservationsRepo
      .find({
        where: [],
        relations: ['guest', 'room'],
        order: { createdAt: 'DESC' },
      })
      .then((all) => all.filter((r) => r.checkInDate >= fromDate && r.checkInDate <= toDate));
  }

  async cancellations(fromDate: string, toDate: string) {
    return this.cancellationsRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.reservation', 'reservation')
      .where('DATE(c.cancellation_date) BETWEEN :fromDate AND :toDate', { fromDate, toDate })
      .orderBy('c.cancellation_date', 'DESC')
      .getMany();
  }

  async roomPerformance() {
    return this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoin('r.room', 'room')
      .select('room.room_number', 'roomNumber')
      .addSelect('COUNT(*)', 'totalBookings')
      .addSelect('SUM(r.total_amount)', 'totalRevenue')
      .where('r.booking_status = :status', { status: BookingStatus.CHECKED_OUT })
      .groupBy('room.room_number')
      .orderBy('totalRevenue', 'DESC')
      .getRawMany();
  }

  async paymentSummary(fromDate: string, toDate: string) {
    return this.paymentsRepo
      .createQueryBuilder('p')
      .select('p.payment_method', 'method')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        "COALESCE(SUM(CASE WHEN p.payment_status IN ('PAID', 'PARTIAL') THEN p.amount WHEN p.payment_status = 'REFUNDED' THEN -p.amount ELSE 0 END), 0)",
        'total',
      )
      .where('DATE(p.paid_at) BETWEEN :fromDate AND :toDate', { fromDate, toDate })
      .groupBy('p.payment_method')
      .getRawMany();
  }

  async exportRevenueCsv(fromDate: string, toDate: string): Promise<string> {
    const data = await this.revenue(fromDate, toDate);
    const rows = ['Date,Total Revenue ($)'];
    data.forEach((r) => rows.push(`${r.date},${r.total}`));
    return rows.join('\n');
  }

  async exportOccupancyCsv(fromDate: string, toDate: string): Promise<string> {
    const data = await this.occupancy(fromDate, toDate);
    const rows = ['Date,Rooms Booked,Occupancy Rate (%)'];
    data.forEach((r) => rows.push(`${r.date},${r.roomsBooked},${r.occupancyRate}`));
    return rows.join('\n');
  }

  async exportBookingsCsv(fromDate: string, toDate: string): Promise<string> {
    const data = await this.bookings(fromDate, toDate);
    const rows = ['Reference,Guest,Room,Check-in,Check-out,Status,Total ($)'];
    data.forEach((r) => {
      const guestName = r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'N/A';
      const roomNum = r.room ? r.room.roomNumber : 'N/A';
      rows.push(
        `"${r.bookingReference}","${guestName}","${roomNum}",${r.checkInDate},${r.checkOutDate},${r.bookingStatus},${r.totalAmount}`,
      );
    });
    return rows.join('\n');
  }

  async exportCancellationsCsv(fromDate: string, toDate: string): Promise<string> {
    const data = await this.cancellations(fromDate, toDate);
    const rows = ['Reservation,Reason,Fee ($),Refund ($),Status,Date'];
    data.forEach((c) => {
      const ref = c.reservation?.bookingReference || c.reservationId;
      const dateStr = new Date(c.cancellationDate).toISOString().slice(0, 10);
      rows.push(`"${ref}","${c.reason || ''}",${c.cancellationFee},${c.refundAmount},${c.status},${dateStr}`);
    });
    return rows.join('\n');
  }
}
