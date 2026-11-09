import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Device tokens last a year; the app re-registers transparently when one expires. */
const TOKEN_TTL = '365d';
/** How long a "live" lookup is trusted before checking the database again. */
const REVOCATION_CACHE_MS = 60_000;
const REVOCATION_CACHE_MAX = 5_000;

interface DeviceTokenPayload {
  /** Subject: whose data this install works on (every `deviceId` column). */
  sub: string;
  /** Install id (DeviceIdentity.deviceId). Absent in pre-account tokens → same as sub. */
  did?: string;
  typ: 'device';
}

/** Who a verified token speaks for. */
export interface DevicePrincipal {
  subjectId: string;
  installId: string;
}

/**
 * Install identity and the device token.
 *
 * Every install gets a server-issued id inside a signed JWT (separate secret
 * and `typ` from anything else). The token carries two ids: `did`, the install
 * itself — revocation is per install — and `sub`, the subject whose data the
 * install reads and writes. A fresh install is its own subject; signing in to
 * an account re-issues the token with the account's subject, so a second phone
 * sees the same data without any rows moving.
 */
@Injectable()
export class DeviceAuthService {
  private readonly secret: string;
  /** installId → { subject the install currently works on, checkedAt } */
  private readonly liveCache = new Map<string, { subjectId: string; at: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_DEVICE_SECRET');
  }

  /**
   * New install → a fresh server-issued id. Client-chosen ids are never
   * accepted: anyone who knew one could pre-claim another install's data.
   */
  async register(): Promise<{ token: string; deviceId: string }> {
    const deviceId = randomUUID();
    await this.prisma.deviceIdentity.create({ data: { deviceId } });
    return { deviceId, token: this.sign(deviceId, deviceId) };
  }

  /** The principal inside a valid token whose install is live and still on that subject — or null. */
  async verify(token: string): Promise<DevicePrincipal | null> {
    let payload: DeviceTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<DeviceTokenPayload>(token, {
        secret: this.secret,
        algorithms: ['HS256'],
      });
    } catch {
      return null;
    }
    if (payload.typ !== 'device' || typeof payload.sub !== 'string') return null;
    const installId = typeof payload.did === 'string' ? payload.did : payload.sub;
    const current = await this.currentSubject(installId, payload.sub);
    // A token minted before a sign-in (old subject) stops working once the install switches.
    if (!current || current !== payload.sub) return null;
    return { subjectId: payload.sub, installId };
  }

  /**
   * Point an install at a subject (sign-in to an account) and mint its new token.
   * The previous token for this install is rejected from then on.
   */
  async issueFor(installId: string, subjectId: string): Promise<string> {
    await this.prisma.deviceIdentity.update({
      where: { deviceId: installId },
      data: { subjectId: subjectId === installId ? null : subjectId },
    });
    this.liveCache.delete(installId);
    return this.sign(subjectId, installId);
  }

  /** Kill one install's token (logout). */
  async revoke(installId: string): Promise<void> {
    await this.prisma.deviceIdentity.updateMany({
      where: { deviceId: installId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.liveCache.delete(installId);
  }

  /** Kill every install working on a subject (data/account deletion, merged-away subjects). */
  async revokeSubject(subjectId: string): Promise<void> {
    const where = { OR: [{ subjectId }, { deviceId: subjectId, subjectId: null }] };
    const installs = await this.prisma.deviceIdentity.findMany({ where, select: { deviceId: true } });
    await this.prisma.deviceIdentity.updateMany({
      where: { ...where, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    for (const { deviceId } of installs) this.liveCache.delete(deviceId);
  }

  private sign(subjectId: string, installId: string): string {
    const payload: DeviceTokenPayload = { sub: subjectId, did: installId, typ: 'device' };
    return this.jwt.sign(payload, { secret: this.secret, expiresIn: TOKEN_TTL, algorithm: 'HS256' });
  }

  /**
   * The subject a live install works on, or null when revoked/unknown. A cache
   * hit only counts when it matches the token: right after a sign-in another
   * instance may still cache the old subject, so a mismatch re-reads the DB.
   */
  private async currentSubject(installId: string, expected: string): Promise<string | null> {
    const cached = this.liveCache.get(installId);
    if (cached && cached.subjectId === expected && Date.now() - cached.at < REVOCATION_CACHE_MS) {
      return cached.subjectId;
    }
    const row = await this.prisma.deviceIdentity.findUnique({
      where: { deviceId: installId },
      select: { revokedAt: true, subjectId: true },
    });
    if (!row || row.revokedAt) return null;
    const subjectId = row.subjectId ?? installId;
    this.liveCache.set(installId, { subjectId, at: Date.now() });
    if (this.liveCache.size > REVOCATION_CACHE_MAX) {
      this.liveCache.delete(this.liveCache.keys().next().value as string);
    }
    return subjectId;
  }
}
