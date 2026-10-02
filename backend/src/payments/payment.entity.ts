import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Reservation } from '../reservations/reservation.entity';
import { PaymentMethod, PaymentStatus } from '../common/enums';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Reservation, { eager: false })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @Column({ name: 'reservation_id' })
  reservationId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    name: 'payment_method',
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    name: 'payment_status',
    default: PaymentStatus.PAID,
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'transaction_reference', nullable: true })
  transactionReference: string;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
