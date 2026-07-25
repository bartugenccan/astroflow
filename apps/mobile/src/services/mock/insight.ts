import { DailyInsight, EnergyState, NatalChartData } from "../types";
import { Locale } from "../../i18n";

type InsightCopy = { title: string; summary: string };

/**
 * Daily insight fixtures keyed by energy state and locale.
 * Mirrors the API's DailyInsight (energyState/title/summary subset).
 */
const INSIGHTS: Record<EnergyState, Record<Locale, InsightCopy>> = {
  HARMONY: {
    en: {
      title: "A day that flows with you",
      summary:
        "The sky favours ease today. Trust the openings that appear and let one meaningful connection deepen — momentum will meet you halfway.",
    },
    tr: {
      title: "Seninle akan bir gün",
      summary:
        "Gökyüzü bugün rahatlıktan yana. Önüne çıkan açıklıklara güven ve anlamlı bir bağı derinleştir — akış seni yarı yolda karşılayacak.",
    },
  },
  MOMENTUM: {
    en: {
      title: "Energy wants direction",
      summary:
        "There's fuel in the air — channel it into one decisive move rather than many scattered ones. Begin the thing you've been circling.",
    },
    tr: {
      title: "Enerji yön arıyor",
      summary:
        "Havada bir yakıt var — onu dağınık hamleler yerine tek ve kararlı bir adıma yönlendir. Etrafında dolandığın o şeye başla.",
    },
  },
  STRESS: {
    en: {
      title: "Soften your pace",
      summary:
        "Friction in the transits asks for patience, not force. Protect your focus, postpone the heavy conversation, and let the tension pass through.",
    },
    tr: {
      title: "Temponu yumuşat",
      summary:
        "Transitlerdeki gerilim güç değil sabır istiyor. Odağını koru, ağır konuşmayı ertele ve gerilimin geçip gitmesine izin ver.",
    },
  },
  OVERLOAD: {
    en: {
      title: "Return to the ground",
      summary:
        "The signals are loud today. Do less, breathe slower, and choose rest over reaction — clarity returns once the noise settles.",
    },
    tr: {
      title: "Yeniden yere dön",
      summary:
        "Sinyaller bugün yüksek. Daha az yap, daha yavaş nefes al ve tepki yerine dinlenmeyi seç — gürültü dindiğinde berraklık geri gelir.",
    },
  },
};

/** Pick an energy state deterministically from the chart's harmonic/challenging balance. */
export function insightFromChart(
  chart: NatalChartData,
  locale: Locale,
): DailyInsight {
  const harmonic = chart.aspects.filter((a) => a.type === "harmonic").length;
  const challenging = chart.aspects.filter((a) => a.type === "challenging").length;
  const total = chart.aspects.length || 1;

  let state: EnergyState;
  if (challenging > harmonic + 2) state = "OVERLOAD";
  else if (challenging > harmonic) state = "STRESS";
  else if (harmonic > challenging + 2) state = "HARMONY";
  else state = "MOMENTUM";

  // touch total to keep it meaningful; nudges edge cases toward MOMENTUM
  if (total < 3) state = "MOMENTUM";

  const copy = INSIGHTS[state][locale];
  return { energyState: state, title: copy.title, summary: copy.summary };
}
