import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private instance: any | null = null;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly isConfigured: boolean;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    this.isConfigured = Boolean(
      this.keyId &&
        this.keyId !== 'rzp_test_placeholder_key' &&
        this.keySecret &&
        this.keySecret !== 'rzp_test_placeholder_secret',
    );

    if (this.isConfigured) {
      try {
        this.instance = new Razorpay({
          key_id: this.keyId,
          key_secret: this.keySecret,
        });
        this.logger.log(`Razorpay SDK initialized successfully with Key ID: ${this.keyId}`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize Razorpay SDK: ${err.message}`);
        this.isConfigured = false;
      }
    } else {
      this.logger.warn('Razorpay is not configured (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing or placeholder).');
    }
  }

  isConfiguredStatus(): boolean {
    return this.isConfigured;
  }

  async createOrder(reservationId: string, amountInRupees: number): Promise<RazorpayOrderResult> {
    if (!this.isConfigured || !this.instance) {
      throw new BadRequestException(
        'Razorpay not configured. Please set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend environment variables.',
      );
    }

    const amountInPaise = Math.round(amountInRupees * 100);

    try {
      const order = await this.instance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${reservationId.slice(0, 10)}_${Date.now()}`,
        notes: { reservationId },
      });
      return { ...order, keyId: this.keyId };
    } catch (err: any) {
      this.logger.error(`Razorpay API Order Creation Failed: ${err.message}`);
      throw new BadRequestException(`Razorpay API Error: ${err.message || 'Failed to create order on Razorpay.'}`);
    }
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!orderId || !paymentId || !signature) return false;
    if (!this.keySecret) return false;

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === signature;
    if (!isValid) {
      this.logger.warn(`Razorpay Signature Mismatch! Expected: ${expectedSignature}, Received: ${signature}`);
    }
    return isValid;
  }

  /** Helper to generate valid HMAC signature for automated tests */
  generateTestSignature(orderId: string, paymentId: string): string {
    if (!this.keySecret) return '';
    const body = `${orderId}|${paymentId}`;
    return crypto.createHmac('sha256', this.keySecret).update(body).digest('hex');
  }

  getKeyId(): string {
    return this.keyId;
  }
}
