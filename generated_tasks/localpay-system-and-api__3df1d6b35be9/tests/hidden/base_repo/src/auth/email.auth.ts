import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  getUserDisplayName = (ctx: any): string => {
    const firstName = ctx.from?.first_name ?? '';
    const lastName = ctx.from?.last_name ?? '';
    const username = ctx.from?.username;

    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }

    if (username) {
      return `@${username}`;
    }

    return 'there';
  };
  async syncUser(authId: string, email: string) {
    console.log('heyy');
    return await this.prisma.user.upsert({
      where: { authId },
      update: {},
      create: {
        authId,
        email,
      },
    });
  }
  async buildRedirectParams(
    email: string,
    userId: string,
  ): Promise<{ ref: string; sig: string }> {
    const secret = process.env.URL_SECRET!;

    // Salt makes every URL unique even for the same user
    const salt = Math.random().toString(36).slice(2, 10);

    // Payload: salt prefix + shuffled fields so order is not obvious
    const payload = {
      s: salt,
      b: userId, // 'b' not 'userId' — field names are intentionally cryptic
      c: email, // 'c' not 'email'
      d: Date.now(), // timestamp
    };

    // Encode: JSON → XOR-shift → base64url
    const json = JSON.stringify(payload);
    const shifted = this.xorShift(json, 0x5a);
    const ref = this.toB64(shifted);

    // Sign the encoded ref (not the raw JSON)
    const sig = await this.hmac(ref, secret);

    return { ref, sig };
  }
  private xorShift(str: string, key: number): string {
    return str
      .split('')
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ ((key + i) % 127)))
      .join('');
  }

  private toB64(str: string): string {
    return Buffer.from(str, 'utf8').toString('base64url');
  }
  private async hmac(data: string, secret: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return Buffer.from(sig).toString('base64url');
  }
  async getClientIdByAuthId(authId: string): Promise<string | null> {
    const user = await this.prisma.gatewayClient.findUnique({
      where: { authId },
      select: { id: true },
    });
    return user?.id ?? null;
  }
}
