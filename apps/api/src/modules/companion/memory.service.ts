import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export type MemoryKind = 'chat' | 'checkin' | 'topic' | 'goal' | 'fact';

/**
 * Device-scoped memory of what the user tells us, so every AI surface can feel
 * continuous ("last week work was heavy…"). MVP digest = active intentions +
 * the most recent raw entries; a rolling AI summary is a later optimization.
 */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Persist one thing worth remembering. Best-effort — never throws upward. */
  async remember(deviceId: string, kind: MemoryKind, text: string): Promise<void> {
    const clean = (text ?? '').trim().slice(0, 400);
    if (!clean) return;
    try {
      await this.prisma.memoryEntry.create({ data: { deviceId, kind, text: clean } });
    } catch (err) {
      this.logger.warn(`memory write failed: ${(err as Error).message}`);
    }
  }

  /**
   * Compact context block for prompts: the user's active intentions + their most
   * recent memory entries. Empty string when there's nothing yet.
   */
  async getDigest(deviceId: string, limit = 8): Promise<string> {
    try {
      const [intentions, entries] = await Promise.all([
        this.prisma.intention.findMany({
          where: { deviceId, status: 'active' },
          select: { goalText: true },
          take: 5,
        }),
        this.prisma.memoryEntry.findMany({
          where: { deviceId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: { kind: true, text: true },
        }),
      ]);

      const lines: string[] = [];
      if (intentions.length) {
        lines.push(`Active goals: ${intentions.map((i) => i.goalText).join('; ')}.`);
      }
      if (entries.length) {
        // Oldest→newest reads more naturally as a recap.
        lines.push(
          ...entries
            .reverse()
            .map((e) => `- (${e.kind}) ${e.text}`),
        );
      }
      return lines.join('\n');
    } catch (err) {
      this.logger.warn(`memory read failed: ${(err as Error).message}`);
      return '';
    }
  }
}
