import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { localToday } from '../../common/context/request-context';
import { lunarWindow } from '../mascot/mascot-rules';
import { isWaitingForMoon, LifeArea } from '../intentions/intention-rules';
import { buildPlan, MoodSky, PlanPayload, PlanWhy, weekStrip } from './plan-rules';
import { DeviceSkyService } from './device-sky.service';

const AREAS: LifeArea[] = ['love', 'career', 'money', 'energy'];

/** What the day's plan was built from; a change (new mood, new wish) rebuilds it. */
type PlanInputsKey = string;

export interface StoredPlan extends PlanPayload {
  inputsKey: PlanInputsKey;
}

/**
 * Today's personal sky plan. Built from the stored natal chart and the
 * day's real transits by the pure `buildPlan`, cached per (subject, local
 * day) and rebuilt only when what it depends on changes. No AI.
 */
@Injectable()
export class PlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sky: DeviceSkyService,
  ) {}

  async today(deviceId: string): Promise<PlanPayload> {
    const today = localToday();
    const [wishes, mood, cached] = await Promise.all([
      this.prisma.intention.findMany({
        where: { deviceId, status: 'active' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, lifeArea: true, plantedMoon: true },
      }),
      this.prisma.moodCheckIn.findUnique({ where: { deviceId_localDate: { deviceId, localDate: today } } }),
      this.prisma.dailyPlan.findUnique({ where: { deviceId_localDate: { deviceId, localDate: today } } }),
    ]);
    const open = wishes.filter((w) => !isWaitingForMoon(w.plantedMoon, today));
    const inputsKey = `${mood?.sky ?? '-'}|${open.map((w) => w.id).join(',')}`;
    const stored = cached?.payload as unknown as StoredPlan | undefined;
    if (stored && stored.inputsKey === inputsKey) return strip(stored);

    const birth = await this.sky.requireBirth(deviceId);
    const report = this.sky.report(birth);
    const best = this.sky.bestDays(birth, 7, today);
    const todayScore = best.scores.find((s) => s.date === today) ?? best.scores[0] ?? null;

    const areaReasons: Partial<Record<LifeArea, PlanWhy>> = {};
    for (const area of AREAS) {
      const hit = best.daily[area].find((d) => d.date === today);
      if (hit) {
        areaReasons[area] = {
          transitPlanet: hit.transitPlanet,
          aspect: hit.aspect,
          natalPoint: hit.natalPlanet,
          nature: hit.nature,
        };
      }
    }
    const lunar = lunarWindow(new Date());

    const payload = buildPlan({
      today,
      transits: DeviceSkyService.transits(report),
      moon: DeviceSkyService.moon(report),
      areaScores: todayScore
        ? { love: todayScore.love, career: todayScore.career, money: todayScore.money, energy: todayScore.energy }
        : null,
      areaReasons,
      week: weekStrip(best.scores),
      intentions: open.map((w) => ({ id: w.id, lifeArea: w.lifeArea as LifeArea })),
      mood: (mood?.sky as MoodSky | undefined) ?? null,
      lunar: lunar ? { phase: lunar.phase, peakDate: lunar.peakDate } : null,
    });

    const toStore: StoredPlan = { ...payload, inputsKey };
    await this.prisma.dailyPlan.upsert({
      where: { deviceId_localDate: { deviceId, localDate: today } },
      create: { deviceId, localDate: today, payload: toStore as object },
      update: { payload: toStore as object },
    });
    return payload;
  }
}

function strip({ inputsKey: _key, ...payload }: StoredPlan): PlanPayload {
  return payload;
}
