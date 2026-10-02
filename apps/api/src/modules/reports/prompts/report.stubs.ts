import { Locale } from '../../astrology/interpretation.types';
import type { TimelineEvent } from '../../astrology/transit-timeline.service';
import { planetName, signName } from '../../election/election.labels';
import { describeEvent, fullDate } from '../report.labels';
import type { NatalBalance, NatalExtras, TransitQuarter, TransitSpotlight } from '../reports.types';

/**
 * Templated sections for when the AI is unavailable (no key, budget or balance
 * exhausted, provider down). Built from the computed data, so they stay true —
 * just shorter. They are never cached, so a later report gets the real text.
 */

const ELEMENT_TR: Record<string, string> = { Fire: 'Ateş', Earth: 'Toprak', Air: 'Hava', Water: 'Su' };
const MODALITY_TR: Record<string, string> = { Cardinal: 'öncü', Fixed: 'sabit', Mutable: 'değişken' };

const ordinal = (n: number) => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
};

export function natalExtrasStub(locale: Locale, b: NatalBalance): NatalExtras {
  const tr = locale === 'tr';
  const ruler = b.chartRuler
    ? tr
      ? `Harita yöneticin ${planetName(b.chartRuler.planet, locale)}; ${signName(b.chartRuler.sign, locale)} burcunda ve ${b.chartRuler.house}. evde. Hayatının yönü bu evin konularında belirginleşir.`
      : `Your chart ruler is ${planetName(b.chartRuler.planet, locale)}, in ${signName(b.chartRuler.sign, locale)} in the ${ordinal(b.chartRuler.house)} house. Your life's direction comes into focus through that house's themes.`
    : tr
      ? 'Doğum saatin bilinmediği için harita yöneticin kesin değil; Güneş ve Ay burçların bu rolü üstlenir.'
      : "With no birth time the chart ruler is uncertain; your Sun and Moon carry that role instead.";
  return {
    balance: tr
      ? `Haritanda ${ELEMENT_TR[b.dominantElement] ?? b.dominantElement} elementi ve ${MODALITY_TR[b.dominantModality] ?? b.dominantModality} nitelik öne çıkıyor. Bu, enerjini nasıl harcadığını ve dünyaya nasıl yaklaştığını belirleyen ana tonu oluşturur.`
      : `${b.dominantElement} and the ${b.dominantModality.toLowerCase()} modality lead your chart — the main tone of how you spend your energy and meet the world.`,
    chartRuler: ruler,
    themes: tr
      ? {
          love: 'İlişkilerde Venüs ve 7. evinin konumu senin dilini belirler.',
          career: 'İş hayatında Tepe Noktan (MC) ve 10. evin yönü gösterir.',
          money: 'Para ve değerler konusunda 2. evin ve Venüs belirleyicidir.',
          growth: 'Gelişim yolunu Ay Düğümlerin ve Satürn gösterir.',
        }
      : {
          love: "In love, Venus and your 7th house set your language.",
          career: 'At work, your Midheaven (MC) and 10th house show the direction.',
          money: 'Money and values are shaped by your 2nd house and Venus.',
          growth: 'Your Lunar Nodes and Saturn trace the path of growth.',
        },
    closing: tr
      ? 'Haritan bir kader değil, bir harita: yönü sen seçersin.'
      : 'Your chart is a map, not a fate: you choose the route.',
  };
}

export function spotlightStub(locale: Locale, e: TimelineEvent): Omit<TransitSpotlight, 'eventId'> {
  const tr = locale === 'tr';
  return {
    title: tr ? `${planetName(e.planet, locale)} dönemi` : `The ${planetName(e.planet, locale)} season`,
    text: describeEvent(e, locale),
    howToUse: tr
      ? 'Bu tarihleri takvimine işaretle; büyük kararları tam tarihlere yakın, sakin kafayla ver.'
      : 'Mark these dates; make big decisions near the exact dates, with a clear head.',
  };
}

export function quarterStub(locale: Locale, from: string, to: string, events: TimelineEvent[]): TransitQuarter {
  const tr = locale === 'tr';
  return {
    from,
    to,
    title: tr ? `${fullDate(from, locale)} – ${fullDate(to, locale)}` : `${fullDate(from, locale)} – ${fullDate(to, locale)}`,
    text: events.length
      ? events.slice(0, 6).map((e) => describeEvent(e, locale)).join('. ') + '.'
      : tr
        ? 'Bu dönemde büyük bir transit yok; toparlanmak ve kendine alan açmak için uygun bir zaman.'
        : 'No major transits this period — a good time to consolidate and make room for yourself.',
    focus: tr
      ? ['Önemli tarihleri takvimine işle.', 'Büyük adımları tam tarihlere yakın at.', 'Kendine dinlenme alanı bırak.']
      : ['Put the key dates in your calendar.', 'Take big steps near the exact dates.', 'Leave yourself room to rest.'],
  };
}
