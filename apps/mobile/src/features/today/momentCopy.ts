import type { Ionicons } from "@expo/vector-icons";
import type { Locale, TFunction, TranslationKey } from "../../i18n";
import { formatDayMonthYear, todayISO } from "../../lib/dates";
import { ordinal } from "../../lib/astroLanguage";
import type { Tone } from "../../lib/design-system";
import type { SkyMoment, SkyMomentKind } from "../../services/types";
import { planetName, signName } from "./planCopy";

type IconName = keyof typeof Ionicons.glyphMap;

const DAY = 86_400_000;
/** The Today card shows an upcoming moment only if it starts within this many days. */
const HEADLINE_HORIZON_DAYS = 45;

/** A natal point in the reader's language (planets, angles, nodes). */
export function targetName(t: TFunction, target: string | null): string {
  if (!target) return "";
  const key = `moments.target.${target}` as TranslationKey;
  const label = t(key);
  return label === key ? planetName(t, target) : label;
}

/** The local calendar day of an ISO instant, formatted ("14 Kas 2026"). */
export function momentDate(locale: Locale, iso: string): string {
  return formatDayMonthYear(locale, todayISO(new Date(iso)));
}

const aspectKey = (form: "aspect" | "aspectBase", a: NonNullable<SkyMoment["aspect"]>) =>
  `moments.${form}.${a}` as TranslationKey;

export function momentTitle(t: TFunction, m: SkyMoment): string {
  const planet = planetName(t, m.planet);
  const target = targetName(t, m.target);
  const aspect = m.aspect ? t(aspectKey("aspect", m.aspect)) : "";
  switch (m.kind) {
    case "saturn_return":
      return t((m.detail.cycle ?? 1) >= 2 ? "moments.title.saturn_return2" : "moments.title.saturn_return");
    case "eclipse_on_natal":
      return t(m.planet === "Sun" ? "moments.title.eclipse_solar" : "moments.title.eclipse_lunar", { target });
    case "lunation_on_natal":
      return t(m.detail.lunationKind === "full" ? "moments.title.lunation_full" : "moments.title.lunation_new", {
        target,
      });
    case "progressed_lunation":
      return t(
        m.detail.lunationKind === "full" ? "moments.title.progressed_lunation_full" : "moments.title.progressed_lunation_new",
      );
    default:
      return t(`moments.title.${m.kind}` as TranslationKey, {
        planet,
        target,
        aspect,
        sign: m.detail.sign ? signName(t, m.detail.sign) : "",
      });
  }
}

export function momentBody(t: TFunction, locale: Locale, m: SkyMoment): string {
  const planet = planetName(t, m.planet);
  const target = targetName(t, m.target);
  const aspectBase = m.aspect ? t(aspectKey("aspectBase", m.aspect)) : "";
  const themeKey = `moments.theme.${m.planet}` as TranslationKey;
  const theme = t(themeKey) === themeKey ? "" : t(themeKey);
  const station = m.detail.stationKind ? t(`moments.station.${m.detail.stationKind}` as TranslationKey) : "";
  switch (m.kind) {
    case "eclipse_on_natal":
      return t("moments.body.eclipse", { target });
    case "lunation_on_natal":
      return t("moments.body.lunation", {
        target,
        lunation: t(m.detail.lunationKind === "full" ? "moments.lunationName.full" : "moments.lunationName.new"),
      });
    case "progressed_lunation":
      return t(
        m.detail.lunationKind === "full" ? "moments.body.progressed_lunation_full" : "moments.body.progressed_lunation_new",
        { age: m.detail.age ?? "" },
      );
    case "retrograde_period":
      return t("moments.body.retrograde_period", {
        planet,
        start: momentDate(locale, m.start),
        end: momentDate(locale, m.end),
      });
    default:
      return t(`moments.body.${m.kind}` as TranslationKey, {
        planet,
        target,
        aspectBase,
        theme,
        station,
        age: m.detail.age ?? "",
        sign: m.detail.sign ? signName(t, m.detail.sign) : "",
      });
  }
}

/** "Active now · until 12 Mar 2027" / "From 3 Dec 2026" / a single day. */
export function momentWhen(t: TFunction, locale: Locale, m: SkyMoment): string {
  const singleDay = Date.parse(m.end) - Date.parse(m.start) <= 7 * DAY;
  if (singleDay) return t("moments.when.day", { date: momentDate(locale, m.peak) });
  if (m.status === "active") {
    return m.openEnded
      ? t("moments.when.activeOpen")
      : t("moments.when.active", { end: momentDate(locale, m.end) });
  }
  return t("moments.when.upcoming", { start: momentDate(locale, m.start) });
}

export function momentHouseLine(t: TFunction, locale: Locale, m: SkyMoment): string | null {
  return m.detail.house ? t("moments.houseLine", { house: ordinal(locale, m.detail.house) }) : null;
}

const TONE: Record<SkyMomentKind, Tone> = {
  saturn_return: "star",
  jupiter_return: "mint",
  nodal_return: "sky",
  nodal_reversal: "sky",
  outer_transit: "primary",
  generational: "primary",
  station_on_natal: "sky",
  chart_ruler_station: "sky",
  eclipse_on_natal: "candy",
  lunation_on_natal: "mint",
  retrograde_period: "cloud",
  double_retrograde: "cloud",
  chiron_return: "mint",
  progressed_moon_return: "primary",
  progressed_moon_sign: "primary",
  progressed_sun_sign: "star",
  progressed_lunation: "primary",
};

const ICON: Record<SkyMomentKind, IconName> = {
  saturn_return: "planet",
  jupiter_return: "planet-outline",
  nodal_return: "git-compare-outline",
  nodal_reversal: "git-compare-outline",
  outer_transit: "planet-outline",
  generational: "people-outline",
  station_on_natal: "pause-circle-outline",
  chart_ruler_station: "compass-outline",
  eclipse_on_natal: "contrast-outline",
  lunation_on_natal: "moon-outline",
  retrograde_period: "refresh-outline",
  double_retrograde: "repeat-outline",
  chiron_return: "bandage-outline",
  progressed_moon_return: "hourglass-outline",
  progressed_moon_sign: "hourglass-outline",
  progressed_sun_sign: "sunny-outline",
  progressed_lunation: "moon-outline",
};

export const momentTone = (m: SkyMoment): Tone => TONE[m.kind];
export const momentIcon = (m: SkyMoment): IconName => ICON[m.kind];

/** The soft, non-classical note (shown with a caveat). */
export const isSoftNote = (m: SkyMoment) => m.kind === "double_retrograde";

/**
 * The moments worth a card on Today, best first: active ones, then those
 * starting within the next weeks. The list is already ranked by the server;
 * past moments drop out.
 */
export function visibleMoments(moments: SkyMoment[], now: Date = new Date()): SkyMoment[] {
  const horizon = now.getTime() + HEADLINE_HORIZON_DAYS * DAY;
  return moments.filter((m) => m.status === "active" || (m.status === "upcoming" && Date.parse(m.start) <= horizon));
}
