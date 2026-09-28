import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { RoomType } from '../room-types/room-type.entity';
import { RoomStatus } from '../common/enums';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'room_number' })
  roomNumber: string;

  @ManyToOne(() => RoomType, (roomType) => roomType.rooms, { eager: true })
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType;

  @Column({ name: 'room_type_id' })
  roomTypeId: string;

  @Column()
  floor: number;

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.AVAILABLE })
  @Index()
  status: RoomStatus;

  // Per-room price override; falls back to roomType.basePrice if null
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
