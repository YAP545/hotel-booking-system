import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

// Single-row table (id is always fixed) holding configurable business rules,
// so tax %/cancellation fee are never hardcoded in service logic.
@Entity('hotel_settings')
export class HotelSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'hotel_name', default: 'Grand Hotel' })
  hotelName: string;

  @Column('decimal', { name: 'tax_percent', precision: 5, scale: 2, default: 12.0 })
  taxPercent: number;

  @Column('decimal', {
    name: 'cancellation_fee_percent',
    precision: 5,
    scale: 2,
    default: 10.0,
  })
  cancellationFeePercent: number;

  @Column({ name: 'free_cancellation_hours', default: 48 })
  freeCancellationHours: number;

  @Column({ name: 'check_in_time', default: '14:00' })
  checkInTime: string;

  @Column({ name: 'check_out_time', default: '11:00' })
  checkOutTime: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
