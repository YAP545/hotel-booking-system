import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

import { User } from '../users/user.entity';
import { RoomType } from '../room-types/room-type.entity';
import { Room } from '../rooms/room.entity';
import { Guest } from '../guests/guest.entity';
import { Reservation } from '../reservations/reservation.entity';
import { Payment } from '../payments/payment.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Cancellation } from '../cancellations/cancellation.entity';
import { CheckIn } from '../check-in/check-in.entity';
import { CheckOut } from '../check-out/check-out.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { HotelSettings } from '../settings/hotel-settings.entity';

import { RefreshToken } from '../auth/entities/refresh-token.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306', 10),
  username: process.env.DATABASE_USER || 'hotel_user',
  password: process.env.DATABASE_PASSWORD || 'hotel_password',
  database: process.env.DATABASE_NAME || 'hotel_booking',
  entities: [
    User,
    RoomType,
    Room,
    Guest,
    Reservation,
    Payment,
    Invoice,
    Cancellation,
    CheckIn,
    CheckOut,
    AuditLog,
    HotelSettings,
    RefreshToken,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: false,
});

