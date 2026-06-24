import { Injectable } from '@nestjs/common';

export interface CheckoutTokenPayload {
  clientId: string;
  userId: string;
  email: string;
  checkoutId: string;
  invoiceId: string;
  amount: number;
}

@Injectable()
export class CheckoutTokenService {
  private readonly encoder = new TextEncoder();
  private readonly WINDOW_S = 60 * 5; // 5 minutes expiry

  /**
   * Public method to generate JWT-like checkout token
   */
  async buildCheckoutToken(payload: CheckoutTokenPayload): Promise<string> {
    const header = this.b64url(
      this.encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    );

    const body = this.b64url(
      this.encoder.encode(
        JSON.stringify({
          sub: payload.userId,
          email: payload.email,
          cid: payload.checkoutId,
          iid: payload.invoiceId,
          amt: payload.amount,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + this.WINDOW_S,
          aud: 'checkout',
          iss: process.env.NEXT_PUBLIC_APP_DOMAIN,
          clId: payload.clientId,
        }),
      ),
    );

    const data = `${header}.${body}`;
    const key = await this.getSigningKey();

    const signature = await crypto.subtle.sign(
      { name: 'HMAC' },
      key,
      this.encoder.encode(data),
    );

    return `${data}.${this.b64url(signature)}`;
  }

  // ─────────────────────────────────────────────
  // 🔒 PRIVATE HELPERS
  // ─────────────────────────────────────────────

  private b64url(buf: ArrayBuffer | Uint8Array): string {
    return Buffer.from(buf as ArrayBuffer).toString('base64url');
  }

  private fromB64url(str: string): ArrayBuffer {
    const buf = Buffer.from(str, 'base64url');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  private async getSigningKey(): Promise<CryptoKey> {
    const secret = process.env.URL_SECRET;

    if (!secret) {
      throw new Error('URL_SECRET env var is not set');
    }

    return crypto.subtle.importKey(
      'raw',
      this.encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
  }
}
