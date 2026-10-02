import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD } from '@nestjs/core';

import { AppCacheModule } from './common/cache/app-cache.module';
import { EventsModule } from './common/gateways/events.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoomTypesModule } from './room-types/room-types.module';
import { RoomsModule } from './rooms/rooms.module';
import { GuestsModule } from './guests/guests.module';
import { ReservationsModule } from './reservations/reservations.module';
import { CheckInModule } from './check-in/check-in.module';
import { CheckOutModule } from './check-out/check-out.module';
import { PaymentsModule } from './payments/payments.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { HealthModule } from './health/health.module';

import { User } from './users/user.entity';
import { RoomType } from './room-types/room-type.entity';
import { Room } from './rooms/room.entity';
import { Guest } from './guests/guest.entity';
import { Reservation } from './reservations/reservation.entity';
import { Payment } from './payments/payment.entity';
import { Invoice } from './invoices/invoice.entity';
import { Cancellation } from './cancellations/cancellation.entity';
import { CheckIn } from './check-in/check-in.entity';
import { CheckOut } from './check-out/check-out.entity';
import { AuditLog } from './common/entities/audit-log.entity';
import { HotelSettings } from './settings/hotel-settings.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['backend/.env', '.env', '../.env'],
    }),
    AppCacheModule,
    EventsModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        autoLogging: false,
      },
    }),

    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 20,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 120,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DATABASE_HOST'),
        port: config.get<number>('DATABASE_PORT'),
        username: config.get<string>('DATABASE_USER'),
        password: config.get<string>('DATABASE_PASSWORD'),
        database: config.get<string>('DATABASE_NAME'),
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
        // Migrations are the source of truth for schema changes; keep this off.
        synchronize: false,
      }),
    }),

    AuthModule,
    UsersModule,
    RoomTypesModule,
    RoomsModule,
    GuestsModule,
    ReservationsModule,
    CheckInModule,
    CheckOutModule,
    PaymentsModule,
    InvoicesModule,
    ReportsModule,
    SettingsModule,
    AuditLogModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
