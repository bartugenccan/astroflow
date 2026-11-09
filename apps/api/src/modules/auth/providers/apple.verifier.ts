import { createHash } from 'crypto';
import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose';
import { safeError } from '../../../common/logging/safe-error';
import { SecretBox } from '../account/secret-box';
import type { VerifiedIdentity } from './verified-identity';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

/**
 * Sign in with Apple, verified server-side.
 *
 * The identity token is checked against Apple's JWKS (issuer, audience = our
 * bundle id, nonce). When the app also sends the one-time authorization code
 * and the SIWA key is configured, the code is exchanged for a refresh token,
 * stored sealed: App Store rules require revoking it when the account is
 * deleted (`revoke`).
 */
@Injectable()
export class AppleVerifier {
  private readonly logger = new Logger(AppleVerifier.name);
  private readonly clientId: string;
  private readonly teamId: string;
  private readonly keyId: string;
  private readonly privateKey: string;
  private readonly box: SecretBox | null;

  constructor(config: ConfigService) {
    this.clientId = config.get<string>('APPLE_BUNDLE_ID') || 'com.astroflow.app';
    this.teamId = config.get<string>('APPLE_TEAM_ID') ?? '';
    this.keyId = config.get<string>('APPLE_KEY_ID') ?? '';
    // .p8 contents; env files usually carry it with literal "\n".
    this.privateKey = (config.get<string>('APPLE_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n');
    const encKey = config.get<string>('AUTH_ENCRYPTION_KEY') ?? '';
    this.box = encKey ? new SecretBox(encKey) : null;
  }

  /** Token exchange + revocation need the SIWA key; verification alone does not. */
  private get canExchange(): boolean {
    return Boolean(this.teamId && this.keyId && this.privateKey && this.box);
  }

  async verify(input: {
    identityToken: string;
    rawNonce: string;
    authorizationCode?: string;
    displayName?: string | null;
  }): Promise<VerifiedIdentity> {
    let payload: Record<string, unknown>;
    try {
      ({ payload } = await jwtVerify(input.identityToken, APPLE_JWKS, {
        issuer: APPLE_ISSUER,
        audience: this.clientId,
      }));
    } catch (err) {
      this.logger.warn(`Apple identity token rejected: ${safeError(err)}`);
      throw new UnauthorizedException('Invalid Apple sign-in');
    }
    const expectedNonce = createHash('sha256').update(input.rawNonce).digest('hex');
    if (payload.nonce !== expectedNonce || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid Apple sign-in');
    }

    let appleRefreshTokenEnc: string | null = null;
    if (input.authorizationCode && this.canExchange) {
      appleRefreshTokenEnc = await this.exchangeCode(input.authorizationCode);
    } else if (input.authorizationCode) {
      this.logger.warn('SIWA key not configured — Apple refresh token not stored (revocation on deletion impossible)');
    }

    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
    return {
      provider: 'APPLE',
      providerSubject: payload.sub,
      email,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      appleRefreshTokenEnc,
      displayName: input.displayName ?? null,
    };
  }

  /** Revoke a stored refresh token (account deletion / unlink). Best effort. */
  async revoke(sealed: string | null | undefined): Promise<void> {
    if (!sealed || !this.canExchange || !this.box) return;
    try {
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: await this.clientSecret(),
        token: this.box.open(sealed),
        token_type_hint: 'refresh_token',
      });
      const res = await fetch(`${APPLE_ISSUER}/auth/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) this.logger.warn(`Apple token revoke failed: HTTP ${res.status}`);
    } catch (err) {
      this.logger.warn(`Apple token revoke failed: ${safeError(err)}`);
    }
  }

  private async exchangeCode(code: string): Promise<string | null> {
    try {
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: await this.clientSecret(),
        code,
        grant_type: 'authorization_code',
      });
      const res = await fetch(`${APPLE_ISSUER}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.warn(`Apple code exchange failed: HTTP ${res.status}`);
        return null;
      }
      const json = (await res.json()) as { refresh_token?: string };
      return json.refresh_token && this.box ? this.box.seal(json.refresh_token) : null;
    } catch (err) {
      // Sign-in still succeeds; only later revocation is affected.
      this.logger.warn(`Apple code exchange failed: ${safeError(err)}`);
      return null;
    }
  }

  /** Apple's client secret is a short-lived ES256 JWT signed with the SIWA key. */
  private async clientSecret(): Promise<string> {
    if (!this.canExchange) throw new ServiceUnavailableException('Sign in with Apple is not configured');
    const key = await importPKCS8(this.privateKey, 'ES256');
    return new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: this.keyId })
      .setIssuer(this.teamId)
      .setIssuedAt()
      .setExpirationTime('5m')
      .setAudience(APPLE_ISSUER)
      .setSubject(this.clientId)
      .sign(key);
  }
}
