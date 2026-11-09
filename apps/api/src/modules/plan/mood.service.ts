import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { localToday } from '../../common/context/request-context';
import { MascotDelta, MascotService, MascotView } from '../mascot/mascot.service';
import { DeviceSkyService } from './device-sky.service';
import type { MoodSky } from './plan-rules';

export const MOOD_SKIES: readonly MoodSky[] = ['RADIANT', 'CLEAR', 'PARTLY', 'CLOUDY', 'STORMY'];
const HEAVY: readonly MoodSky[] = ['CLOUDY', 'STORMY'];

export interface MoodReply {
  /** i18n key on the device: mood.reply.<SKY>. */
  replyKey: string;
  /** Where the Moon is in the natal chart today, for the reply's second line. */
  moon: { sign: string; natalHouse: number } | null;
  /** A heavy sky gets a gentle nudge to breathe (Finch's first-aid kit). */
  suggestBreath: boolean;
}

/**
 * The morning "how is your sky?" check-in. Only the label (and a 1–5 energy)
 * is stored; Aster's reply is a deterministic template the device renders,
 * coloured by where today's Moon falls in the user's natal houses.
 */
@Injectable()
export class MoodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mascot: MascotService,
    private readonly sky: DeviceSkyService,
  ) {}

  async checkIn(
    deviceId: string,
    sky: MoodSky,
    energy: number,
  ): Promise<{ delta: MascotDelta; reply: MoodReply; state: MascotView }> {
    const localDate = localToday();
    await this.prisma.moodCheckIn.upsert({
      where: { deviceId_localDate: { deviceId, localDate } },
      create: { deviceId, localDate, sky, energy },
      update: { sky, energy },
    });
    const delta = await this.mascot.award(deviceId, 'SKY_CHECKIN');
    const birth = await this.sky.birth(deviceId);
    const moon = birth ? DeviceSkyService.moon(this.sky.report(birth)) : null;
    return {
      delta,
      reply: { replyKey: `mood.reply.${sky}`, moon, suggestBreath: HEAVY.includes(sky) },
      state: await this.mascot.getState(deviceId),
    };
  }

  /** The last `days` check-in labels, newest first — the companion's mood context. */
  async recent(deviceId: string, days = 7): Promise<{ localDate: string; sky: MoodSky; energy: number }[]> {
    const rows = await this.prisma.moodCheckIn.findMany({
      where: { deviceId },
      orderBy: { localDate: 'desc' },
      take: days,
      select: { localDate: true, sky: true, energy: true },
    });
    return rows.map((r) => ({ localDate: r.localDate, sky: r.sky as MoodSky, energy: r.energy }));
  }
}
