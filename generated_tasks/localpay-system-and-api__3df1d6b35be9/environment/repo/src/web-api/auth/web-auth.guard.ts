import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from 'src/auth/email.auth';
export interface SessionPayload {
  userId: string;
  email: string;
}
export interface WebUser {
  userId: string; // externalServiceId — what the external service sends
  email: string;
}

@Injectable()
export class WebAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const authHeader: string | undefined = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header.',
      );
    }

    const token = authHeader.slice(7).trim();

    const { email, userId } = await this.verifySessionJwt(token);
    let payload: { userId: string; email: string };
    try {
      payload = {
        userId,
        email,
      };
    } catch {
      throw new UnauthorizedException('Malformed token payload.');
    }

    if (!payload.userId || !payload.email) {
      throw new UnauthorizedException('Incomplete token payload.');
    }

    req.webUser = payload;
    // await this.auth.syncUser(userId, email);
    return true;
  }
  async getSigningKey(): Promise<CryptoKey> {
    const secret = process.env.SESSION_SECRET!;
    if (!secret) throw new Error('SESSION_SECRET env var is not set');

    return crypto.subtle.importKey(
      'raw',
      this.encoder.encode(secret),
      {
        name: 'HMAC',
        hash: 'SHA-256',
      },
      false,
      ['sign', 'verify'],
    );
  }
  async verifySessionJwt(token: string): Promise<SessionPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('INVALID_JWT');

    const [header, body, sigPart] = parts;
    const data = `${header}.${body}`;

    const key = await this.getSigningKey();
    const valid = await crypto.subtle.verify(
      { name: 'HMAC' },
      key,
      this.fromB64url(sigPart), // ✅ now valid BufferSource
      this.encoder.encode(data),
    );

    if (!valid) throw new Error('INVALID_JWT_SIGNATURE');

    let claims: SessionPayload & { exp: number };

    try {
      claims = JSON.parse(this.decoder.decode(this.fromB64url(body)));
    } catch {
      throw new Error('MALFORMED_JWT');
    }

    if (claims.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('EXPIRED_JWT');
    }

    if (!claims.userId || !claims.email) {
      throw new Error('INCOMPLETE_JWT');
    }

    return {
      userId: claims.userId,
      email: claims.email,
    };
  }
  private fromB64url(str: string): ArrayBuffer {
    const buf = Buffer.from(str, 'base64url');

    // ✅ return a REAL ArrayBuffer (not ArrayBufferLike)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
}
