import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DeviceAuthService } from '../auth/device-auth.service';

/**
 * The "delete my data" path for an anonymous device: every row the API holds
 * for it goes in one transaction, then its token is revoked so the install
 * starts over as a new device.
 */
@Injectable()
export class DeviceDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: DeviceAuthService,
  ) {}

  async deleteAll(deviceId: string): Promise<Record<string, number>> {
    const where = { deviceId };
    const [
      chatMessages,
      memories,
      checkIns,
      streaks,
      intentions,
      savedPeople,
      charts,
      unlocks,
      aiUsage,
      cachedReadings,
      reports,
    ] = await this.prisma.$transaction([
      this.prisma.chatMessage.deleteMany({ where }),
      this.prisma.memoryEntry.deleteMany({ where }),
      this.prisma.intentionCheckIn.deleteMany({ where }),
      this.prisma.intentionStreak.deleteMany({ where }),
      this.prisma.intention.deleteMany({ where }),
      this.prisma.savedPerson.deleteMany({ where }),
      this.prisma.deviceChart.deleteMany({ where }),
      this.prisma.deviceUnlockedFeature.deleteMany({ where }),
      this.prisma.aiUsage.deleteMany({ where }),
      this.prisma.interpretation.deleteMany({ where }),
      this.prisma.report.deleteMany({ where }),
    ]);
    await this.auth.revoke(deviceId);
    return {
      chatMessages: chatMessages.count,
      memories: memories.count,
      checkIns: checkIns.count,
      streaks: streaks.count,
      intentions: intentions.count,
      savedPeople: savedPeople.count,
      charts: charts.count,
      unlocks: unlocks.count,
      aiUsage: aiUsage.count,
      cachedReadings: cachedReadings.count,
      reports: reports.count,
    };
  }
}
