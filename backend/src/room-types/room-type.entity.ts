import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Room } from '../rooms/room.entity';

@Entity('room_types')
export class RoomType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  capacity: number;

  @Column('decimal', { name: 'base_price', precision: 10, scale: 2 })
  basePrice: number;

  // Stored as JSON array of strings, e.g. ["WiFi","AC","TV"]
  @Column('json', { nullable: true })
  amenities: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Room, (room) => room.roomType)
  rooms: Room[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
