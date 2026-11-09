import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DeviceAuthService } from '../auth/device-auth.service';
import { AccountService } from '../auth/account/account.service';

/**
 * The "delete my data" path for a subject: every row the API holds for it goes
 * in one transaction; then its account (if any) — Apple tokens revoked,
 * identities and sign-in codes dropped — and finally every install working on
 * it is revoked, so each starts over as a new device.
 *
 * Every device-keyed table must be listed here and in SubjectMergeService.
 */
@Injectable()
export class DeviceDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: DeviceAuthService,
    private readonly accounts: AccountService,
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
      quotas,
      cachedReadings,
      reports,
      mascotEvents,
      mascotStates,
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
      this.prisma.dailyQuota.deleteMany({ where }),
      this.prisma.interpretation.deleteMany({ where }),
      this.prisma.report.deleteMany({ where }),
      this.prisma.mascotEvent.deleteMany({ where }),
      this.prisma.mascotState.deleteMany({ where }),
    ]);
    const account = await this.accounts.deleteForSubject(deviceId);
    await this.auth.revokeSubject(deviceId);
    return {
      account: account ? 1 : 0,
      chatMessages: chatMessages.count,
      memories: memories.count,
      checkIns: checkIns.count,
      streaks: streaks.count,
      intentions: intentions.count,
      savedPeople: savedPeople.count,
      charts: charts.count,
      unlocks: unlocks.count,
      aiUsage: aiUsage.count,
      quotas: quotas.count,
      cachedReadings: cachedReadings.count,
      reports: reports.count,
      mascotEvents: mascotEvents.count,
      mascotStates: mascotStates.count,
    };
  }
}
