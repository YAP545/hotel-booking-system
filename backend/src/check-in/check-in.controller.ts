import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
@Controller('reservations')
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Post(':id/check-in')
  checkIn(@Param('id') id: string, @CurrentUser() user: any) {
    return this.checkInService.checkIn(id, user);
  }
}
