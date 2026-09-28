import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Reservation } from '../reservations/reservation.entity';
import { CancellationStatus } from '../common/enums';

@Entity('cancellations')
export class Cancellation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Reservation, { eager: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @Column({ name: 'reservation_id' })
  reservationId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'cancellation_date', type: 'datetime' })
  cancellationDate: Date;

  @Column('decimal', { name: 'cancellation_fee', precision: 10, scale: 2, default: 0 })
  cancellationFee: number;

  @Column('decimal', { name: 'refund_amount', precision: 10, scale: 2 })
  refundAmount: number;

  @Column({ type: 'enum', enum: CancellationStatus, default: CancellationStatus.APPROVED })
  status: CancellationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
