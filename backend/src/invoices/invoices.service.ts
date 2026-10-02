import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './invoice.entity';
import { UserRole } from '../common/enums';

@Injectable()
export class InvoicesService {
  constructor(@InjectRepository(Invoice) private repo: Repository<Invoice>) {}

  findAll() {
    return this.repo.find({ order: { issuedAt: 'DESC' }, take: 200 });
  }

  async findOne(id: string, currentUser?: { id: string; email?: string; role?: UserRole }) {
    const invoice = await this.repo.findOne({
      where: { id },
      relations: ['reservation', 'reservation.guest'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');

    if (currentUser?.role === UserRole.CUSTOMER) {
      if (invoice.reservation?.guest?.email !== currentUser.email) {
        throw new ForbiddenException('You do not have permission to access this invoice.');
      }
    }

    return invoice;
  }

  async findByReservation(reservationId: string, currentUser?: { id: string; email?: string; role?: UserRole }) {
    const invoice = await this.repo.findOne({
      where: { reservationId },
      relations: ['reservation', 'reservation.guest'],
    });
    if (!invoice) throw new NotFoundException('No invoice has been issued for this reservation yet.');

    if (currentUser?.role === UserRole.CUSTOMER) {
      if (invoice.reservation?.guest?.email !== currentUser.email) {
        throw new ForbiddenException('You do not have permission to access this invoice.');
      }
    }

    return invoice;
  }
}
