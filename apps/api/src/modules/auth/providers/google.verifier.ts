import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { safeError } from '../../../common/logging/safe-error';
import type { VerifiedIdentity } from './verified-identity';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/**
 * Google Sign-In, verified server-side: the ID token's signature (Google
 * JWKS), issuer and audience — one of our OAuth client ids (GOOGLE_CLIENT_IDS:
 * the web client the app requests the token for, plus iOS/Android).
 */
@Injectable()
export class GoogleVerifier {
  private readonly logger = new Logger(GoogleVerifier.name);
  private readonly audiences: string[];

  constructor(config: ConfigService) {
    this.audiences = (config.get<string>('GOOGLE_CLIENT_IDS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async verify(idToken: string): Promise<VerifiedIdentity> {
    if (!this.audiences.length) throw new ServiceUnavailableException('Google sign-in is not configured');
    let payload: Record<string, unknown>;
    try {
      ({ payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
        issuer: GOOGLE_ISSUERS,
        audience: this.audiences,
      }));
    } catch (err) {
      this.logger.warn(`Google ID token rejected: ${safeError(err)}`);
      throw new UnauthorizedException('Invalid Google sign-in');
    }
    if (typeof payload.sub !== 'string') throw new UnauthorizedException('Invalid Google sign-in');
    return {
      provider: 'GOOGLE',
      providerSubject: payload.sub,
      email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      emailVerified: payload.email_verified === true,
      displayName: typeof payload.given_name === 'string' ? payload.given_name : null,
    };
  }
}
