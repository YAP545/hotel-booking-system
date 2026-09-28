import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { Guest } from '../guests/guest.entity';
import { Room } from '../rooms/room.entity';
import { BookingStatus } from '../common/enums';
import { CheckIn } from '../check-in/check-in.entity';
import { CheckOut } from '../check-out/check-out.entity';

@Entity('reservations')
@Index(['roomId', 'checkInDate', 'checkOutDate'])
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'booking_reference' })
  bookingReference: string;

  // Groups sibling reservations created together for a multi-room booking.
  @Column({ name: 'group_reference', nullable: true })
  groupReference: string;

  @ManyToOne(() => Guest, { eager: true })
  @JoinColumn({ name: 'guest_id' })
  guest: Guest;

  @Column({ name: 'guest_id' })
  guestId: string;

  @ManyToOne(() => Room, { eager: true })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'room_id' })
  roomId: string;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: string;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate: string;

  @Column({ name: 'number_of_guests', default: 1 })
  numberOfGuests: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
    name: 'booking_status',
  })
  @Index()
  bookingStatus: BookingStatus;

  @Column({ name: 'special_requests', type: 'text', nullable: true })
  specialRequests: string;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column('decimal', { name: 'total_amount', precision: 10, scale: 2 })
  totalAmount: number;

  @OneToOne(() => CheckIn, (c) => c.reservation)
  checkIn: CheckIn;

  @OneToOne(() => CheckOut, (c) => c.reservation)
  checkOut: CheckOut;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
