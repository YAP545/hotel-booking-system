import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'user_name', nullable: true })
  userName: string;

  @Column()
  action: string; // e.g. "CREATE_RESERVATION", "CHECK_IN", "CHANGE_ROOM_STATUS"

  @Column()
  entity: string; // e.g. "Reservation", "Room"

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
