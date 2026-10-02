import { randomUUID } from 'crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Device tokens last a year; the app re-registers transparently when one expires. */
const TOKEN_TTL = '365d';
/** How long a "not revoked" lookup is trusted before checking the database again. */
const REVOCATION_CACHE_MS = 60_000;
const REVOCATION_CACHE_MAX = 5_000;

interface DeviceTokenPayload {
  sub: string;
  typ: 'device';
}

/**
 * Anonymous device identity. The device id is no longer a bearer secret the
 * client invents and sends in clear: the server issues it inside a signed JWT
 * (separate secret and `typ` from user tokens), and revoking it — when the
 * device's data is deleted — makes the token useless.
 */
@Injectable()
export class DeviceAuthService {
  private readonly secret: string;
  private readonly liveCache = new Map<string, number>(); // deviceId → checkedAt

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_DEVICE_SECRET');
  }

  /**
   * New install → a fresh server-issued id. An existing install may claim the
   * id it already used (one-time migration from the raw header era) only if
   * nobody has claimed it yet; otherwise 409 and the app starts fresh.
   */
  async register(legacyDeviceId?: string): Promise<{ token: string; deviceId: string }> {
    const deviceId = legacyDeviceId ?? randomUUID();
    try {
      await this.prisma.deviceIdentity.create({ data: { deviceId } });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('This device id is already registered');
      }
      throw err;
    }
    return { deviceId, token: this.sign(deviceId) };
  }

  /** The device id inside a valid, unrevoked device token — or null. */
  async verify(token: string): Promise<string | null> {
    let payload: DeviceTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<DeviceTokenPayload>(token, { secret: this.secret });
    } catch {
      return null;
    }
    if (payload.typ !== 'device' || typeof payload.sub !== 'string') return null;
    return (await this.isLive(payload.sub)) ? payload.sub : null;
  }

  /** Kill the device's token (used when its data is deleted). */
  async revoke(deviceId: string): Promise<void> {
    await this.prisma.deviceIdentity.updateMany({
      where: { deviceId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.liveCache.delete(deviceId);
  }

  private sign(deviceId: string): string {
    const payload: DeviceTokenPayload = { sub: deviceId, typ: 'device' };
    return this.jwt.sign(payload, { secret: this.secret, expiresIn: TOKEN_TTL });
  }

  private async isLive(deviceId: string): Promise<boolean> {
    const checkedAt = this.liveCache.get(deviceId);
    if (checkedAt && Date.now() - checkedAt < REVOCATION_CACHE_MS) return true;
    const row = await this.prisma.deviceIdentity.findUnique({
      where: { deviceId },
      select: { revokedAt: true },
    });
    if (!row || row.revokedAt) return false;
    this.liveCache.set(deviceId, Date.now());
    if (this.liveCache.size > REVOCATION_CACHE_MAX) {
      this.liveCache.delete(this.liveCache.keys().next().value as string);
    }
    return true;
  }
}
