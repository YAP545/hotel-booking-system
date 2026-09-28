import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
} from 'typeorm';
import { Reservation } from '../reservations/reservation.entity';
import { Room } from '../rooms/room.entity';
import { User } from '../users/user.entity';

@Entity('check_outs')
export class CheckOut {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Reservation, (r) => r.checkOut)
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @Column({ name: 'reservation_id' })
  reservationId: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'room_id' })
  roomId: string;

  @Column({ name: 'check_out_time', type: 'datetime' })
  checkOutTime: Date;

  @Column('decimal', { name: 'final_amount', precision: 10, scale: 2 })
  finalAmount: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'checked_out_by' })
  checkedOutBy: User;

  @Column({ name: 'checked_out_by' })
  checkedOutById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
