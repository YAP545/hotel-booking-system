import { Controller, Get, Query, UseGuards, Header } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }

  private defaultRange(fromDate?: string, toDate?: string) {
    const to = toDate || new Date().toISOString().slice(0, 10);
    const from =
      fromDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    return { from, to };
  }

  @Get('revenue')
  revenue(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    const { from, to } = this.defaultRange(fromDate, toDate);
    return this.service.revenue(from, to);
  }

  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="revenue_report.csv"')
  @Get('revenue/export')
  exportRevenue(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    const { from, to } = this.defaultRange(fromDate, toDate);
    return this.service.exportRevenueCsv(from, to);
  }

  @Get('occupancy')
  occupancy(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    const { from, to } = this.defaultRange(fromDate, toDate);
    return this.service.occupancy(from, to);
  }

  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="occupancy_report.csv"')
  @Get('occupancy/export')
  exportOccupancy(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    const { from, to } = this.defaultRange(fromDate, toDate);
    return this.service.exportOccupancyCsv(from, to);
  }

  @Get('bookings')
  bookings(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    const { from, to } = this.defaultRange(fromDate, toDate);
    return this.service.bookings(from, to);
  }

  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="bookings_report.csv"')
  @Get('bookings/export')
  exportBookings(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    const { from, to } = this.defaultRange(fromDate, toDate);
    return this.service.exportBookingsCsv(from, to);
  }

  @Get('cancellations')
  cancellations(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    const { from, to } = this.defaultRange(fromDate, toDate);
    return this.service.cancellations(from, to);
  }

  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="cancellations_report.csv"')
  @Get('cancellations/export')
  exportCancellations(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    const { from, to } = this.defaultRange(fromDate, toDate);
    return this.service.exportCancellationsCsv(from, to);
  }

  @Get('room-performance')
  roomPerformance() {
    return this.service.roomPerformance();
  }

  @Get('payment-summary')
  paymentSummary(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    const { from, to } = this.defaultRange(fromDate, toDate);
    return this.service.paymentSummary(from, to);
  }
}
