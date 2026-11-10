import { ConflictException, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";
import { localToday } from "../../common/context/request-context";
import { safeError } from "../../common/logging/safe-error";
import { AI_TEXT_PROVIDER, AiTextProvider } from "../ai/ai-text-provider";
import type { Locale } from "../astrology/interpretation.types";
import {
  JourneyDiscovery,
  MascotDelta,
  MascotService,
  MascotView,
} from "../mascot/mascot.service";
import {
  DUPLICATE_STARDUST,
  JOURNEY_HOURS,
  journeyEarnsShield,
} from "../mascot/mascot-rules";
import { pickConstellation } from "../mascot/constellations";
import { DeviceSkyService } from "./device-sky.service";
import { PlanService } from "./plan.service";
import type { PlanTransit } from "./plan-rules";
import {
  discoveryPrompt,
  discoveryStub,
  discoverySystem,
  DiscoveryText,
} from "./journey.prompts";

export interface JourneyClaim {
  delta: MascotDelta;
  discovery: JourneyDiscovery;
  constellationKey: string;
  duplicate: boolean;
  bonusStardust: number;
  shieldGranted: boolean;
  state: MascotView;
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === "P2002";
}

/**
 * Aster's cosmic journey — Finch's adventure loop, pointed at the chart. When
 * the day's energy is high enough Aster sets off; a few hours later it is back
 * with one real transit to the user's natal chart (worded by the AI, chosen by
 * code, never the plan's lead transit) and a constellation for the album.
 * Everything resolves on read; there is no timer on the server.
 */
@Injectable()
export class JourneyService {
  private readonly logger = new Logger(JourneyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mascot: MascotService,
    private readonly sky: DeviceSkyService,
    private readonly plan: PlanService,
    private readonly config: ConfigService,
    @Inject(AI_TEXT_PROVIDER) private readonly ai: AiTextProvider,
  ) {}

  /** How long Aster is away; a dev-only override makes it testable. */
  private awayMs(): number {
    const production = this.config.get<string>("NODE_ENV") === "production";
    const minutes = this.config.get<number>("JOURNEY_MINUTES");
    if (!production && minutes) return minutes * 60_000;
    return JOURNEY_HOURS * 3_600_000;
  }

  async launch(deviceId: string, locale: Locale): Promise<MascotView> {
    const state = await this.mascot.getState(deviceId);
    if (state.journey.status !== "ready") {
      throw new ConflictException(
        `Aster can't set off now (${state.journey.status})`,
      );
    }
    const birth = await this.sky.requireBirth(deviceId);
    const transits = DeviceSkyService.transits(this.sky.report(birth));
    const plan = await this.plan.today(deviceId).catch(() => null);
    const lead = plan?.steps.find((s) => s.why)?.why ?? null;
    const pick =
      transits.find(
        (t) =>
          !lead ||
          t.transitPlanet !== lead.transitPlanet ||
          t.natalPlanet !== lead.natalPoint ||
          t.aspect !== lead.aspect,
      ) ?? transits[0];

    const owned = (
      await this.prisma.mascotConstellation.findMany({
        where: { deviceId },
        select: { key: true },
      })
    ).map((c) => c.key);
    const constellationKey = pickConstellation({
      sunSign: birth.sunSign,
      discoverySign: pick?.transitSign ?? null,
      owned,
      rolls: [Math.random(), Math.random()],
    });
    const duplicate = owned.includes(constellationKey);
    const discovery = pick
      ? await this.discovery(pick, locale)
      : this.quietSky(locale);

    try {
      await this.prisma.mascotJourney.create({
        data: {
          deviceId,
          localDate: localToday(),
          returnsAt: new Date(Date.now() + this.awayMs()),
          discovery: discovery as object,
          constellationKey,
          duplicate,
          bonusStardust: duplicate ? DUPLICATE_STARDUST : 0,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictException("Aster already travelled today");
      throw err;
    }
    return this.mascot.getState(deviceId);
  }

  async claim(deviceId: string): Promise<JourneyClaim> {
    const today = localToday();
    // Only a journey that is back and not yet opened; the guard makes it once-only.
    const res = await this.prisma.mascotJourney.updateMany({
      where: {
        deviceId,
        localDate: today,
        claimedAt: null,
        returnsAt: { lte: new Date() },
      },
      data: { claimedAt: new Date() },
    });
    if (res.count === 0)
      throw new ConflictException("No journey to open right now");
    const journey = await this.prisma.mascotJourney.findUniqueOrThrow({
      where: { deviceId_localDate: { deviceId, localDate: today } },
    });

    await this.prisma.mascotConstellation.upsert({
      where: { deviceId_key: { deviceId, key: journey.constellationKey } },
      create: { deviceId, key: journey.constellationKey },
      update: { count: { increment: 1 } },
    });
    if (journey.bonusStardust > 0) {
      await this.prisma.mascotState.update({
        where: { deviceId },
        data: { stardust: { increment: journey.bonusStardust } },
      });
    }
    const delta = await this.mascot.award(deviceId, "JOURNEY_RETURN", today);
    const counted = await this.prisma.mascotState.update({
      where: { deviceId },
      data: { journeysCompleted: { increment: 1 } },
      select: { journeysCompleted: true },
    });
    const shieldGranted = journeyEarnsShield(counted.journeysCompleted)
      ? await this.mascot.grantShield(deviceId)
      : false;

    return {
      delta,
      discovery: journey.discovery as unknown as JourneyDiscovery,
      constellationKey: journey.constellationKey,
      duplicate: journey.duplicate,
      bonusStardust: journey.bonusStardust,
      shieldGranted,
      state: await this.mascot.getState(deviceId),
    };
  }

  private async discovery(
    t: PlanTransit,
    locale: Locale,
  ): Promise<JourneyDiscovery> {
    let text: DiscoveryText = discoveryStub(locale, t);
    if (this.ai.available) {
      try {
        const { user, schemaHint } = discoveryPrompt(locale, t);
        const parsed = await this.ai.generateJson<Partial<DiscoveryText>>({
          system: discoverySystem(locale),
          user,
          schemaHint,
          temperature: 0.8,
          maxTokens: 400,
        });
        if (parsed.title && parsed.body) {
          text = {
            title: parsed.title.slice(0, 80),
            body: parsed.body.slice(0, 400),
          };
        }
      } catch (err) {
        this.logger.warn(`journey discovery AI failed: ${safeError(err)}`);
      }
    }
    return {
      transitPlanet: t.transitPlanet,
      aspect: t.aspect,
      natalPoint: t.natalPlanet,
      nature: t.nature,
      orb: t.orb,
      sign: t.transitSign,
      title: text.title,
      body: text.body,
      link: `/chart?planet=${encodeURIComponent(t.natalPlanet)}&transit=${encodeURIComponent(t.transitPlanet)}`,
    };
  }

  /** No transit within orb today — rare, but Aster still comes home with something. */
  private quietSky(locale: Locale): JourneyDiscovery {
    return {
      transitPlanet: "",
      aspect: "",
      natalPoint: "",
      nature: "neutral",
      orb: 0,
      sign: "",
      title: locale === "tr" ? "Sakin bir gökyüzü" : "A quiet sky",
      body:
        locale === "tr"
          ? "Bugün haritana dokunan güçlü bir transit yok; gökyüzü sana nefes alanı bırakıyor. Kendine iyi bak."
          : "No strong transit touches your chart today; the sky is giving you room to breathe. Be kind to yourself.",
      link: "/chart",
    };
  }
}
