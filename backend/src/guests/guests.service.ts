import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guest } from './guest.entity';
import { Reservation } from '../reservations/reservation.entity';
import { CreateGuestDto, UpdateGuestDto } from './dto/guest.dto';
import { BookingStatus, UserRole } from '../common/enums';

@Injectable()
export class GuestsService {
  constructor(
    @InjectRepository(Guest) private repo: Repository<Guest>,
    @InjectRepository(Reservation) private reservationsRepo: Repository<Reservation>,
  ) {}

  async findAll(search?: string, page = 1, limit = 50) {
    const qb = this.repo
      .createQueryBuilder('guest')
      .orderBy('guest.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.where(
        '(guest.first_name LIKE :s OR guest.last_name LIKE :s OR guest.email LIKE :s OR guest.phone LIKE :s)',
        { s: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    // Enrich guests with summary loyalty metrics
    const enriched = await Promise.all(
      data.map(async (guest) => {
        const stats = await this.getGuestStats(guest.id);
        return { ...guest, ...stats };
      }),
    );

    return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private async getGuestStats(guestId: string) {
    const reservations = await this.reservationsRepo.find({
      where: { guestId },
    });

    const completed = reservations.filter((r) => r.bookingStatus === BookingStatus.CHECKED_OUT);
    const completedStays = completed.length;
    let totalNights = 0;
    completed.forEach((r) => {
      const start = new Date(r.checkInDate).getTime();
      const end = new Date(r.checkOutDate).getTime();
      const nights = Math.max(Math.round((end - start) / (1000 * 60 * 60 * 24)), 1);
      totalNights += nights;
    });

    const totalSpent = Number(
      completed.reduce((sum, r) => sum + Number(r.totalAmount), 0).toFixed(2),
    );

    const isVip = totalSpent >= 1000 || completedStays >= 3;
    let loyaltyTier: 'STANDARD' | 'SILVER' | 'GOLD' | 'PLATINUM' = 'STANDARD';
    if (totalSpent >= 2500) loyaltyTier = 'PLATINUM';
    else if (totalSpent >= 1000) loyaltyTier = 'GOLD';
    else if (totalSpent >= 500) loyaltyTier = 'SILVER';

    return { completedStays, totalNights, totalSpent, isVip, loyaltyTier };
  }

  async findOne(id: string, currentUser?: { id: string; email?: string; role?: UserRole }) {
    const guest = await this.repo.findOne({ where: { id } });
    if (!guest) throw new NotFoundException('Guest not found.');

    if (currentUser?.role === UserRole.CUSTOMER) {
      if (guest.email !== currentUser.email) {
        throw new ForbiddenException('You do not have permission to access this guest profile.');
      }
    }

    const reservations = await this.reservationsRepo.find({
      where: { guestId: id },
      relations: ['room', 'room.roomType'],
      order: { createdAt: 'DESC' },
    });

    const stats = await this.getGuestStats(id);

    return { ...guest, reservations, ...stats };
  }

  async create(dto: CreateGuestDto) {
    const guest = this.repo.create(dto);
    return this.repo.save(guest);
  }

  async update(id: string, dto: UpdateGuestDto) {
    const guest = await this.repo.findOne({ where: { id } });
    if (!guest) throw new NotFoundException('Guest not found.');
    Object.assign(guest, dto);
    return this.repo.save(guest);
  }
}
