import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { AuthUser, SupabaseJwtPayload } from './type/supabase-jwt-payload.type';
import { AuthService } from './email.auth';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
      algorithms: ['ES256'],
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      }),
    });
  }
  async validate(payload: SupabaseJwtPayload): Promise<AuthUser> {
    const clientId = await this.authService.getClientIdByAuthId(payload.sub);

    if (!clientId) {
      throw new UnauthorizedException('Client not found');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      clientId,
    };
  }
}
