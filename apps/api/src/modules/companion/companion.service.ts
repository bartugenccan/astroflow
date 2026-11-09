import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AI_TEXT_PROVIDER, AiTextProvider } from '../ai/ai-text-provider';
import { AstrologyAdapterService } from '../astrology/astrology-adapter.service';
import { Locale } from '../astrology/interpretation.types';
import { MemoryService } from './memory.service';
import { companionChatPrompt, companionSystemPrompt } from './companion.prompts';
import { companionStub } from '../astrology/prompts/interpretation.stubs';
import { ChatMessageDto, ChatReply } from './companion.types';
import { safeError } from '../../common/logging/safe-error';
import { localToday } from '../../common/context/request-context';

/** Stored chat turns per subject; older ones are deleted as new ones arrive. */
const CHAT_HISTORY_KEEP = 200;

@Injectable()
export class CompanionService {
  private readonly logger = new Logger(CompanionService.name);

  constructor(
    @Inject(AI_TEXT_PROVIDER) private readonly ai: AiTextProvider,
    private readonly prisma: PrismaService,
    private readonly adapter: AstrologyAdapterService,
    private readonly memory: MemoryService,
  ) {}

  /** Top standout transit lines today — private reasoning for the prompt. */
  private todayTransitLines(
    birthDate: string,
    birthTime: string,
    latitude: number,
    longitude: number,
  ): string[] {
    try {
      const report = this.adapter.getTransitReport(birthDate, birthTime, latitude, longitude);
      return report.movements
        .flatMap((m) => m.aspects.slice(0, 1).map((a) => `${m.planet} ${a.aspect} natal ${a.natalPlanet}`))
        .slice(0, 6);
    } catch {
      return [];
    }
  }

  async sendMessage(
    deviceId: string,
    birth: { birthDate: string; birthTime: string; latitude: number; longitude: number },
    message: string,
    locale: Locale,
  ): Promise<ChatReply> {
    const clean = (message ?? '').trim().slice(0, 1000);
    if (!clean) return { reply: '' };

    // Persist the user's turn first.
    await this.prisma.chatMessage.create({
      data: { deviceId, role: 'user', content: clean },
    });

    const chart = this.adapter.getNatalChart(birth.birthDate, birth.birthTime, birth.latitude, birth.longitude);
    const today = localToday();
    const [digest, recent, moods, plan] = await Promise.all([
      this.memory.getDigest(deviceId),
      this.prisma.chatMessage.findMany({
        where: { deviceId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { role: true, content: true },
      }),
      // Labels only — the check-in never stores free text.
      this.prisma.moodCheckIn.findMany({
        where: { deviceId },
        orderBy: { localDate: 'desc' },
        take: 7,
        select: { localDate: true, sky: true },
      }),
      // Only an already-built plan; chatting never triggers the transit maths.
      this.prisma.dailyPlan.findUnique({
        where: { deviceId_localDate: { deviceId, localDate: today } },
        select: { payload: true },
      }),
    ]);
    const history = recent.reverse();
    const transits = this.todayTransitLines(birth.birthDate, birth.birthTime, birth.latitude, birth.longitude);

    let reply: ChatReply;
    if (!this.ai.available) {
      reply = companionStub(locale);
    } else {
      try {
        const { user, schemaHint } = companionChatPrompt(locale, {
          sun: chart.summary.sunSign,
          moon: chart.summary.moonSign,
          rising: chart.summary.risingSign,
          transits,
          moods: moods.map((m) => `${m.localDate}: ${m.sky.toLowerCase()}`),
          focusArea: (plan?.payload as { focusArea?: string } | null)?.focusArea ?? null,
          memory: digest,
          history,
          message: clean,
        });
        const parsed = await this.ai.generateJson<{
          reply?: string;
          takeaway?: string;
          why?: string;
          remember?: string;
        }>({ system: companionSystemPrompt(locale), user, schemaHint, temperature: 0.85, maxTokens: 900 });
        reply = {
          reply: (parsed.reply ?? '').trim().slice(0, 1500),
          takeaway: parsed.takeaway?.trim().slice(0, 240) || undefined,
          why: parsed.why?.trim().slice(0, 600) || undefined,
        };
        if (parsed.remember) await this.memory.remember(deviceId, 'fact', parsed.remember);
      } catch (err) {
        this.logger.warn(`companion AI failed: ${safeError(err)}`);
        reply = companionStub(locale);
      }
    }

    if (!reply.reply) reply = companionStub(locale);

    await this.prisma.chatMessage.create({
      data: {
        deviceId,
        role: 'assistant',
        content: reply.reply,
        meta: { takeaway: reply.takeaway, why: reply.why },
      },
    });
    // Remember the user's own words as lightweight continuity.
    await this.memory.remember(deviceId, 'chat', clean);
    await this.pruneHistory(deviceId);

    return reply;
  }

  /** Keep only the newest messages: the prompt reads 8 and the app shows 40. */
  private async pruneHistory(deviceId: string): Promise<void> {
    const cutoff = await this.prisma.chatMessage.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      skip: CHAT_HISTORY_KEEP,
      select: { createdAt: true },
    });
    if (!cutoff) return;
    await this.prisma.chatMessage.deleteMany({
      where: { deviceId, createdAt: { lte: cutoff.createdAt } },
    });
  }

  async getHistory(deviceId: string, limit = 40): Promise<ChatMessageDto[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.reverse().map((m) => {
      const meta = (m.meta ?? {}) as { takeaway?: string; why?: string };
      return {
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        takeaway: meta.takeaway,
        why: meta.why,
        createdAt: m.createdAt.toISOString(),
      };
    });
  }
}
