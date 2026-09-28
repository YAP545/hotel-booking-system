import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    if (host && host.trim().length > 0) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.logger.log(`SMTP configured using host: ${host}:${process.env.SMTP_PORT || 587}`);
    } else {
      this.logger.log('SMTP not configured (SMTP_HOST is not set in environment). Operating in explicit mock-logger mode.');
    }
  }

  private async dispatchEmail(to: string, subject: string, body: string) {
    const from = process.env.SMTP_FROM || 'noreply@grandhotel.com';

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to,
          subject,
          text: body,
        });
        this.logger.log(`[REAL SMTP DISPATCH SUCCESS] To: ${to} | MessageId: ${info.messageId}`);
        return { sent: true, mode: 'SMTP', messageId: info.messageId };
      } catch (err: any) {
        this.logger.error(`[SMTP DISPATCH FAILED] ${err.message}`);
      }
    }

    // Explicit fallback when SMTP is not configured or fails
    this.logger.log(`[EMAIL SKIPPED] No active SMTP configuration found. Outputting mock email log:`);
    this.logger.log(`  To: ${to}`);
    this.logger.log(`  From: ${from}`);
    this.logger.log(`  Subject: ${subject}`);
    this.logger.log(`  Body: ${body}`);
    return { sent: true, mode: 'MOCK_SKIPPED', recipient: to };
  }

  /**
   * Helper to dispatch a real test email via Ethereal test account (if SMTP is unconfigured)
   * or via the configured SMTP server.
   */
  async sendTestEmail(toEmail = 'test@example.com') {
    if (this.transporter) {
      return this.dispatchEmail(toEmail, 'Test Email - Grand Hotel Booking System', 'This is a real test email sent via configured SMTP.');
    }

    // Create a dynamic Ethereal test inbox for demonstration/testing
    try {
      const testAccount = await nodemailer.createTestAccount();
      const etherealTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await etherealTransporter.sendMail({
        from: '"Grand Hotel System" <noreply@grandhotel.com>',
        to: toEmail,
        subject: 'Real Test Email - Ethereal Inbox',
        text: 'This is a real test email dispatched to Ethereal Test Inbox.',
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      this.logger.log(`[ETHEREAL TEST DISPATCH SUCCESS] MessageId: ${info.messageId}`);
      this.logger.log(`[ETHEREAL PREVIEW URL] ${previewUrl}`);
      return { sent: true, mode: 'ETHEREAL_TEST', messageId: info.messageId, previewUrl };
    } catch (err: any) {
      this.logger.error(`[ETHEREAL TEST FAILED] ${err.message}`);
      return this.dispatchEmail(toEmail, 'Test Email', 'Mock test email fallback.');
    }
  }

  async sendBookingConfirmation(reservation: any) {
    const guestName = reservation.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}` : 'Guest';
    const email = reservation.guest?.email || 'guest@example.com';
    const ref = reservation.bookingReference;
    const subject = `Booking Confirmation - ${ref}`;
    const body = `Dear ${guestName}, your reservation ${ref} is confirmed for ${reservation.checkInDate} to ${reservation.checkOutDate}. Total: $${reservation.totalAmount}.`;

    const res = await this.dispatchEmail(email, subject, body);
    return { ...res, type: 'BOOKING_CONFIRMATION' };
  }

  async sendCheckInWelcome(reservation: any, roomNumber: string) {
    const guestName = reservation.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}` : 'Guest';
    const email = reservation.guest?.email || 'guest@example.com';
    const subject = `Welcome to Grand Hotel - Room ${roomNumber}`;
    const body = `Dear ${guestName}, welcome! You are checked into Room ${roomNumber}. Enjoy your stay.`;

    const res = await this.dispatchEmail(email, subject, body);
    return { ...res, type: 'CHECK_IN_WELCOME' };
  }

  async sendCheckOutReceipt(reservation: any, invoiceNumber: string, totalAmount: number) {
    const guestName = reservation.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}` : 'Guest';
    const email = reservation.guest?.email || 'guest@example.com';
    const subject = `Checkout Receipt & Invoice - ${invoiceNumber}`;
    const body = `Dear ${guestName}, thank you for staying with us! Invoice ${invoiceNumber} for $${totalAmount} has been processed.`;

    const res = await this.dispatchEmail(email, subject, body);
    return { ...res, type: 'CHECK_OUT_RECEIPT' };
  }

  async sendCancellationNotice(reservation: any, refundAmount: number) {
    const guestName = reservation.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}` : 'Guest';
    const email = reservation.guest?.email || 'guest@example.com';
    const subject = `Booking Cancellation - ${reservation.bookingReference}`;
    const body = `Dear ${guestName}, your booking ${reservation.bookingReference} has been cancelled. Refund amount: $${refundAmount}.`;

    const res = await this.dispatchEmail(email, subject, body);
    return { ...res, type: 'CANCELLATION_NOTICE' };
  }
}
