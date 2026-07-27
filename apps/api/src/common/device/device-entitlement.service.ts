import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureType } from '../../../generated/prisma/client';

/**
 * Device-scoped entitlement checks for the anonymous flow. Mirrors the
 * user-scoped UnlockService but keyed by `deviceId` (the anonymous flow has no
 * User). Payment/IAP is out of scope here — `unlock()` simply records the grant
 * so the real store callback can call it later.
 */
@Injectable()
export class DeviceEntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  async isFeatureUnlocked(
    deviceId: string,
    featureType: FeatureType,
  ): Promise<boolean> {
    try {
      const hit = await this.prisma.deviceUnlockedFeature.findUnique({
        where: { deviceId_featureType: { deviceId, featureType } },
      });
      return hit !== null;
    } catch {
      return false;
    }
  }

  async unlock(deviceId: string, featureType: FeatureType): Promise<void> {
    await this.prisma.deviceUnlockedFeature.upsert({
      where: { deviceId_featureType: { deviceId, featureType } },
      create: { deviceId, featureType },
      update: {},
    });
  }

  async listUnlocked(deviceId: string): Promise<FeatureType[]> {
    const rows = await this.prisma.deviceUnlockedFeature.findMany({
      where: { deviceId },
      select: { featureType: true },
    });
    return rows.map((r) => r.featureType);
  }
}
