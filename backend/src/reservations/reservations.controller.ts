import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { SearchAvailabilityDto } from './dto/search-availability.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, BookingStatus } from '../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get('rooms/available')
  searchAvailability(@Query() dto: SearchAvailabilityDto) {
    return this.reservationsService.searchAvailability(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CUSTOMER)
  @Get('my-bookings')
  findMyBookings(@CurrentUser() user: any) {
    return this.reservationsService.findMyBookings(user.email);
  }

  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CUSTOMER)
  @Post('reservations')
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: any) {
    return this.reservationsService.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @Get('reservations')
  findAll(
    @Query('status') status?: BookingStatus,
    @Query('bookingReference') bookingReference?: string,
    @Query('guestName') guestName?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reservationsService.findAll({
      status,
      bookingReference,
      guestName,
      fromDate,
      toDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CUSTOMER)
  @Get('reservations/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reservationsService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @Patch('reservations/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
    @CurrentUser() user: any,
  ) {
    return this.reservationsService.update(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CUSTOMER)
  @Post('reservations/:id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelReservationDto,
    @CurrentUser() user: any,
  ) {
    return this.reservationsService.cancel(id, dto, user);
  }
}
