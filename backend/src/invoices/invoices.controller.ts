import { Controller, Get, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentUserDto } from '../common/dto/current-user.dto';
import { UserRole } from '../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CUSTOMER)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  findAll(@Query('reservationId') reservationId?: string, @CurrentUser() user?: CurrentUserDto) {
    if (user?.role === UserRole.CUSTOMER && !reservationId) {
      throw new ForbiddenException('Customers can only search invoices by reservationId.');
    }
    if (reservationId) return this.service.findByReservation(reservationId, user);
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: CurrentUserDto) {
    return this.service.findOne(id, user);
  }
}
