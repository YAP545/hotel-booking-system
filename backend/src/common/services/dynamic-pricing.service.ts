import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface DynamicPriceResult {
  basePrice: number;
  averagePricePerNight: number;
  nights: number;
  occupancyMultiplier: number;
  hasWeekendSurge: boolean;
  subtotal: number;
  quoteToken?: string;
}

export interface QuotePayload {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  subtotal: number;
  averagePricePerNight: number;
  nights: number;
  expiresAt: number;
}

@Injectable()
export class DynamicPricingService {
  private readonly secretKey = process.env.JWT_SECRET || 'hotel-booking-secret-key-2026';

  /**
   * Generates a cryptographically signed quote token valid for 15 minutes.
   */
  generateQuoteToken(
    roomId: string,
    checkInDate: string,
    checkOutDate: string,
    subtotal: number,
    averagePricePerNight: number,
    nights: number,
    ttlMinutes = 15,
  ): string {
    const payload: QuotePayload = {
      roomId,
      checkInDate,
      checkOutDate,
      subtotal,
      averagePricePerNight,
      nights,
      expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', this.secretKey).update(payloadB64).digest('hex');

    return `${payloadB64}.${signature}`;
  }

  /**
   * Verifies a quote token's signature and expiration date.
   */
  verifyQuoteToken(token: string): QuotePayload | null {
    if (!token || !token.includes('.')) return null;

    const [payloadB64, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', this.secretKey).update(payloadB64).digest('hex');

    if (signature !== expectedSig) return null;

    try {
      const payload: QuotePayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (Date.now() > payload.expiresAt) return null;
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Calculates dynamic pricing based on room base price, check-in & check-out dates,
   * and current overall hotel occupancy rate (0..100).
   */
  calculatePrice(
    basePrice: number,
    checkInDateStr: string,
    checkOutDateStr: string,
    occupancyRate = 0,
    roomId?: string,
  ): DynamicPriceResult {
    const start = new Date(checkInDateStr);
    const end = new Date(checkOutDateStr);
    const msDiff = end.getTime() - start.getTime();
    const nights = Math.max(Math.round(msDiff / (1000 * 60 * 60 * 24)), 1);

    // 1. Occupancy Surge Multiplier
    let occupancyMultiplier = 1.0;
    if (occupancyRate >= 80) {
      occupancyMultiplier = 1.2; // +20% surge for high demand (>80%)
    } else if (occupancyRate >= 50) {
      occupancyMultiplier = 1.1; // +10% surge for moderate demand (50-80%)
    }

    let totalSubtotal = 0;
    let hasWeekendSurge = false;

    // 2. Night-by-night pricing with weekend surge (Friday = 5, Saturday = 6)
    const current = new Date(start);
    for (let i = 0; i < nights; i++) {
      const dayOfWeek = current.getDay();
      let nightPrice = basePrice * occupancyMultiplier;

      if (dayOfWeek === 5 || dayOfWeek === 6) {
        nightPrice *= 1.15; // +15% weekend rate multiplier
        hasWeekendSurge = true;
      }

      totalSubtotal += nightPrice;
      current.setDate(current.getDate() + 1);
    }

    const roundedSubtotal = Number(totalSubtotal.toFixed(2));
    const averagePricePerNight = Number((roundedSubtotal / nights).toFixed(2));

    const quoteToken = roomId
      ? this.generateQuoteToken(roomId, checkInDateStr, checkOutDateStr, roundedSubtotal, averagePricePerNight, nights)
      : undefined;

    return {
      basePrice,
      averagePricePerNight,
      nights,
      occupancyMultiplier,
      hasWeekendSurge,
      subtotal: roundedSubtotal,
      quoteToken,
    };
  }
}
