import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Reservation } from '../reservations/reservation.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Reservation, { eager: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @Column({ name: 'reservation_id' })
  reservationId: string;

  @Index({ unique: true })
  @Column({ name: 'invoice_number' })
  invoiceNumber: string;

  // Snapshotted at issue time so historical invoices never change retroactively.
  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column({ name: 'issued_at', type: 'datetime' })
  issuedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
