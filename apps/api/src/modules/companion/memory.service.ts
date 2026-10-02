import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { safeError } from '../../common/logging/safe-error';
import { sanitizeMemory, userData } from '../../common/ai/prompt-safety';

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
    // Model-written "facts" are shorter and get the same scrubbing as user text:
    // everything stored here is fed back into future prompts.
    const clean = sanitizeMemory(text, kind === 'fact' ? 160 : 400);
    if (!clean) return;
    try {
      await this.prisma.memoryEntry.create({ data: { deviceId, kind, text: clean } });
    } catch (err) {
      this.logger.warn(`memory write failed: ${safeError(err)}`);
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
        lines.push(`Active goals: ${intentions.map((i) => userData(i.goalText)).join('; ')}.`);
      }
      if (entries.length) {
        // Oldest→newest reads more naturally as a recap.
        lines.push(
          ...entries
            .reverse()
            .map((e) => `- (${e.kind}) ${userData(e.text)}`),
        );
      }
      return lines.join('\n');
    } catch (err) {
      this.logger.warn(`memory read failed: ${safeError(err)}`);
      return '';
    }
  }
}
