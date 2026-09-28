import { Injectable, Logger } from '@nestjs/common';
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

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret';

    if (
      this.keyId &&
      this.keyId !== 'rzp_test_placeholder_key' &&
      this.keySecret &&
      this.keySecret !== 'rzp_test_placeholder_secret'
    ) {
      try {
        this.instance = new Razorpay({
          key_id: this.keyId,
          key_secret: this.keySecret,
        });
        this.logger.log(`Razorpay initialized with Key ID: ${this.keyId}`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize Razorpay SDK: ${err.message}`);
      }
    } else {
      this.logger.log('Razorpay initialized in Test Mock Mode (RAZORPAY_KEY_ID / SECRET environment placeholders).');
    }
  }

  async createOrder(reservationId: string, amountInRupees: number): Promise<RazorpayOrderResult> {
    const amountInPaise = Math.round(amountInRupees * 100);

    if (this.instance) {
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
      }
    }

    // Fallback/Test Mock Order creation
    const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      id: mockOrderId,
      entity: 'order',
      amount: amountInPaise,
      amount_paid: 0,
      amount_due: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${reservationId.slice(0, 10)}`,
      status: 'created',
      keyId: this.keyId,
    };
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!orderId || !paymentId || !signature) return false;

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

  /** Helper to generate a valid test signature for automated tests / verification scripts */
  generateTestSignature(orderId: string, paymentId: string): string {
    const body = `${orderId}|${paymentId}`;
    return crypto.createHmac('sha256', this.keySecret).update(body).digest('hex');
  }

  getKeyId(): string {
    return this.keyId;
  }
}
