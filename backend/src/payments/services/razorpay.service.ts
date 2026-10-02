import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

export interface RazorpayOrderResult {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  keyId: string;
}

export interface RazorpayQrResult {
  id: string;
  entity: string;
  imageUrl?: string;
  amount: number;
  status: string;
  reservationId: string;
  fallback?: boolean;
  message?: string;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private instance: InstanceType<typeof Razorpay> | null = null;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly missingConfigVars: string[] = [];

  constructor(private configService: ConfigService) {
    this.keyId = this.configService.get<string>('RAZORPAY_KEY_ID') || process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret =
      this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!this.keyId || this.keyId === 'rzp_test_placeholder_key' || this.keyId === 'rzp_test_xxxx') {
      this.missingConfigVars.push('RAZORPAY_KEY_ID');
    }
    if (!this.keySecret || this.keySecret === 'rzp_test_placeholder_secret' || this.keySecret === 'your_secret_here') {
      this.missingConfigVars.push('RAZORPAY_KEY_SECRET');
    }

    if (this.missingConfigVars.length === 0) {
      try {
        this.instance = new Razorpay({
          key_id: this.keyId,
          key_secret: this.keySecret,
        });
        this.logger.log(`Razorpay SDK initialized successfully with Key ID: ${this.keyId}`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize Razorpay SDK: ${err.message}`);
      }
    } else {
      this.logger.warn(`Razorpay configuration incomplete. Missing variable(s): ${this.missingConfigVars.join(', ')}.`);
    }
  }

  isConfiguredStatus(): boolean {
    return this.missingConfigVars.length === 0 && this.instance !== null;
  }

  getMissingVars(): string[] {
    return this.missingConfigVars;
  }

  private assertConfigured() {
    if (!this.isConfiguredStatus()) {
      const missing =
        this.missingConfigVars.length > 0 ? this.missingConfigVars.join(', ') : 'RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET';
      throw new BadRequestException(
        `Razorpay configuration incomplete. Missing environment variable(s): ${missing}. Please configure them in backend environment variables (.env).`,
      );
    }
  }

  async createOrder(reservationId: string, amountInRupees: number): Promise<RazorpayOrderResult> {
    this.assertConfigured();

    const amountInPaise = Math.round(amountInRupees * 100);

    try {
      const order = await this.instance!.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${reservationId.slice(0, 10)}_${Date.now()}`,
        notes: { reservationId },
      });
      return {
        id: order.id,
        entity: order.entity,
        amount: Number(order.amount),
        amount_paid: Number(order.amount_paid),
        amount_due: Number(order.amount_due),
        currency: order.currency,
        receipt: order.receipt || '',
        status: order.status,
        keyId: this.keyId,
      };
    } catch (err: any) {
      this.logger.error(`Razorpay API Order Creation Failed: ${err.message}`);
      throw new BadRequestException(`Razorpay API Error: ${err.message || 'Failed to create order on Razorpay.'}`);
    }
  }

  async createQRCode(reservationId: string, amountInRupees: number): Promise<RazorpayQrResult> {
    this.assertConfigured();

    const amountInPaise = Math.round(amountInRupees * 100);

    try {
      const qrCode = await this.instance!.qrCode.create({
        type: 'upi_qr',
        name: 'Grand Hotel Booking',
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: amountInPaise,
        description: `Payment for booking ${reservationId.slice(0, 8)}`,
        notes: { reservationId },
      });

      return {
        id: qrCode.id,
        entity: qrCode.entity,
        imageUrl: qrCode.image_url,
        amount: amountInRupees,
        status: qrCode.status,
        reservationId,
      };
    } catch (err: any) {
      this.logger.error(`Razorpay QR Code API Error: ${err.message || err}`);
      return {
        id: '',
        entity: 'qr_code',
        amount: amountInRupees,
        status: 'unavailable',
        reservationId,
        fallback: true,
        message: err.message || 'Razorpay QR Codes feature is not enabled on this account. Fallback to UPI QR.',
      };
    }
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!orderId || !paymentId || !signature) return false;
    if (!this.keySecret) return false;

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto.createHmac('sha256', this.keySecret).update(body).digest('hex');

    const isValid = expectedSignature === signature;
    if (!isValid) {
      this.logger.warn(`Razorpay Signature Mismatch! Expected: ${expectedSignature}, Received: ${signature}`);
    }
    return isValid;
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!signature) return false;
    const secret = this.webhookSecret || this.keySecret;
    if (!secret) return false;

    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    return expectedSignature === signature;
  }

  generateTestSignature(orderId: string, paymentId: string): string {
    if (!this.keySecret) return '';
    const body = `${orderId}|${paymentId}`;
    return crypto.createHmac('sha256', this.keySecret).update(body).digest('hex');
  }

  generateTestWebhookSignature(payloadString: string): string {
    const secret = this.webhookSecret || this.keySecret;
    if (!secret) return '';
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  getKeyId(): string {
    return this.keyId;
  }
}
