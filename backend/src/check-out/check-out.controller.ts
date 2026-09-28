import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { CheckOutService } from './check-out.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
@Controller('reservations')
export class CheckOutController {
  constructor(private readonly checkOutService: CheckOutService) {}

  @Post(':id/check-out')
  checkOut(@Param('id') id: string, @CurrentUser() user: any) {
    return this.checkOutService.checkOut(id, user);
  }
}
