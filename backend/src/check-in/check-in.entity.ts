import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne, CreateDateColumn } from 'typeorm';
import { Reservation } from '../reservations/reservation.entity';
import { Room } from '../rooms/room.entity';
import { User } from '../users/user.entity';

@Entity('check_ins')
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Reservation, (r) => r.checkIn)
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @Column({ name: 'reservation_id' })
  reservationId: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'room_id' })
  roomId: string;

  @Column({ name: 'check_in_time', type: 'datetime' })
  checkInTime: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'checked_in_by' })
  checkedInBy: User;

  @Column({ name: 'checked_in_by' })
  checkedInById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
