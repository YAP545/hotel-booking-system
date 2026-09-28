import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, RoomStatus } from '../common/enums';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  // NOTE: GET /rooms/available (date-based search) lives in ReservationsController
  // since it depends on reservation overlap logic.

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('roomNumber') roomNumber?: string,
    @Query('floor') floor?: string,
    @Query('roomTypeId') roomTypeId?: string,
    @Query('status') status?: RoomStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      roomNumber,
      floor: floor ? parseInt(floor, 10) : undefined,
      roomTypeId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // Constrained to a UUID shape so this can never shadow GET /rooms/available
  // (registered on ReservationsController), regardless of module import order.
  @UseGuards(JwtAuthGuard)
  @Get(':id([0-9a-fA-F-]{36})')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
