import { Body, Controller, Get, Param, Post, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateRazorpayOrderDto, VerifyRazorpayPaymentDto } from './dto/razorpay-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @Post()
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.paymentsService.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CUSTOMER)
  @Post('razorpay/create-order')
  createRazorpayOrder(@Body() dto: CreateRazorpayOrderDto, @CurrentUser() user: any) {
    return this.paymentsService.createRazorpayOrder(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CUSTOMER)
  @Post('razorpay/verify')
  verifyRazorpayPayment(@Body() dto: VerifyRazorpayPaymentDto, @CurrentUser() user: any) {
    return this.paymentsService.verifyAndRecordRazorpayPayment(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CUSTOMER)
  @Get()
  findAll(@Query('reservationId') reservationId?: string, @CurrentUser() user?: any) {
    if (user?.role === UserRole.CUSTOMER && !reservationId) {
      throw new ForbiddenException('Customers can only view payments by reservationId.');
    }
    if (reservationId) return this.paymentsService.findByReservation(reservationId, user);
    return this.paymentsService.findAll();
  }
}

