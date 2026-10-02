import type { NatalChartData } from '../../astrology/astrology-adapter.service';
import { Locale } from '../../astrology/interpretation.types';
import type { TimelineEvent } from '../../astrology/transit-timeline.service';
import { planetName, signName } from '../../election/election.labels';
import { describeEvent, fullDate } from '../report.labels';
import type { NatalBalance } from '../reports.types';

/** The person's chart in a few dense lines — the grounding every report prompt shares. */
export function chartBrief(chart: NatalChartData, locale: Locale, unknownTime: boolean): string {
  const s = chart.summary;
  const tr = locale === 'tr';
  const planets = chart.planets
    .map((p) => `${planetName(p.name, locale)} ${signName(p.sign, locale)}${unknownTime ? '' : ` ${p.house}${tr ? '. ev' : 'H'}`}${p.retrograde ? ' R' : ''}`)
    .join('; ');
  const rising = unknownTime ? (tr ? 'bilinmiyor' : 'unknown') : signName(s.risingSign, locale);
  return tr
    ? `Güneş ${signName(s.sunSign, locale)}, Ay ${signName(s.moonSign, locale)}, Yükselen ${rising}. Yerleşimler: ${planets}.`
    : `Sun ${signName(s.sunSign, locale)}, Moon ${signName(s.moonSign, locale)}, Rising ${rising}. Placements: ${planets}.`;
}

export function natalExtrasPrompt(
  locale: Locale,
  args: { chart: NatalChartData; balance: NatalBalance; unknownTime: boolean },
): { user: string; schemaHint: string } {
  const { balance: b } = args;
  const elements = Object.entries(b.elements).map(([k, v]) => `${k} ${v}`).join(', ');
  const modalities = Object.entries(b.modalities).map(([k, v]) => `${k} ${v}`).join(', ');
  const ruler = b.chartRuler
    ? locale === 'tr'
      ? `Harita yöneticisi (yükselenin yöneticisi): ${planetName(b.chartRuler.planet, locale)}, ${signName(b.chartRuler.sign, locale)} burcunda, ${b.chartRuler.house}. evde.`
      : `Chart ruler (ruler of the rising sign): ${planetName(b.chartRuler.planet, locale)} in ${signName(b.chartRuler.sign, locale)}, ${b.chartRuler.house}th house.`
    : locale === 'tr'
      ? 'Doğum saati bilinmediği için harita yöneticisi kesin değil — bunu nazikçe belirt ve Güneş ile Ay üzerinden konuş.'
      : 'The birth time is unknown, so the chart ruler is uncertain — say so gently and speak through the Sun and Moon instead.';

  const user =
    locale === 'tr'
      ? `${chartBrief(args.chart, locale, args.unknownTime)}
Element dağılımı (10 gezegen): ${elements}. Nitelikler: ${modalities}. Baskın element: ${b.dominantElement}, baskın nitelik: ${b.dominantModality}.
${ruler}

Bu kişinin doğum haritası raporu için aşağıdaki bölümleri yaz. Yalnızca verilen yerleşimlere dayan, uydurma.
- "balance": 180-230 kelime. Element ve nitelik dengesinin kişiliğe, enerjiye ve ilişki kurma biçimine etkisi; eksik ya da baskın olanın günlük hayattaki karşılığı.
- "chartRuler": 200-260 kelime. Harita yöneticisinin anlamı, bulunduğu burç ve evin hayat yönüne etkisi.
- "themes": dört alan, her biri 150-200 kelime: "love" (aşk ve ilişkiler), "career" (iş ve amaç), "money" (para ve değerler), "growth" (kişisel gelişim ve ders).
- "closing": 100-140 kelime, sıcak bir kapanış.
Tüm metin Türkçe olmalı.`
      : `${chartBrief(args.chart, locale, args.unknownTime)}
Element spread (10 planets): ${elements}. Modalities: ${modalities}. Dominant element: ${b.dominantElement}, dominant modality: ${b.dominantModality}.
${ruler}

Write the following sections of this person's natal chart report. Rely only on the placements given; invent nothing.
- "balance": 180-230 words. How the element and modality balance shapes personality, energy and how they relate; what a missing or dominant one looks like in daily life.
- "chartRuler": 200-260 words. What the chart ruler means and how its sign and house steer the life direction.
- "themes": four areas, 150-200 words each: "love" (love and relationships), "career" (work and purpose), "money" (money and values), "growth" (personal growth and the life lesson).
- "closing": 100-140 words, a warm close.
Write everything in English.`;

  return {
    user,
    schemaHint:
      '{ "balance": string, "chartRuler": string, "themes": { "love": string, "career": string, "money": string, "growth": string }, "closing": string }',
  };
}

export function spotlightPrompt(
  locale: Locale,
  args: { event: TimelineEvent; chart: NatalChartData; unknownTime: boolean },
): { user: string; schemaHint: string } {
  const fact = describeEvent(args.event, locale);
  const user =
    locale === 'tr'
      ? `${chartBrief(args.chart, locale, args.unknownTime)}

Önümüzdeki dönemin en etkili transitlerinden biri (efemeristen hesaplandı, tarihleri değiştirme): ${fact}

- "title": en fazla 8 kelimelik akılda kalıcı bir başlık.
- "text": 200-260 kelime. Bu transit ne demek, hayatın hangi alanında ve nasıl hissedilir, verilen tarihler boyunca nasıl bir seyir izler (birden çok tam tarih varsa her geçişin rolünü anlat). Kaderci olma.
- "howToUse": 70-100 kelime. Bu dönemi en iyi nasıl kullanabileceğine dair somut öneriler.
Tüm metin Türkçe olmalı.`
      : `${chartBrief(args.chart, locale, args.unknownTime)}

One of the most influential transits ahead (computed from the ephemeris — don't change the dates): ${fact}

- "title": a memorable title of at most 8 words.
- "text": 200-260 words. What this transit means, where in life and how it is felt, how it unfolds over the given dates (if there are several exact dates, explain each pass). Not fatalistic.
- "howToUse": 70-100 words. Concrete ways to make the most of this period.
Write everything in English.`;
  return { user, schemaHint: '{ "title": string, "text": string, "howToUse": string }' };
}

export function quarterPrompt(
  locale: Locale,
  args: { from: string; to: string; events: TimelineEvent[]; chart: NatalChartData; unknownTime: boolean },
): { user: string; schemaHint: string } {
  const facts = args.events.length
    ? args.events.map((e) => `- ${describeEvent(e, locale)}`).join('\n')
    : locale === 'tr'
      ? '- (bu dönemde büyük bir transit yok — sakin, toparlayıcı bir dönem)'
      : '- (no major transits this period — a quieter, consolidating stretch)';
  const span = `${fullDate(args.from, locale)} – ${fullDate(args.to, locale)}`;
  const user =
    locale === 'tr'
      ? `${chartBrief(args.chart, locale, args.unknownTime)}

Dönem: ${span}. Bu dönemin hesaplanmış olayları (tarihleri değiştirme):
${facts}

- "title": bu üç ayın ruhunu anlatan en fazla 7 kelimelik başlık.
- "text": 200-260 kelime. Bu üç ay kişi için nasıl geçebilir: hangi temalar öne çıkar, hangi tarihler önemli, olaylar birbirini nasıl etkiler. Yalnızca verilen olaylara dayan.
- "focus": tam olarak 3 madde, her biri tek cümlelik odak önerisi.
Tüm metin Türkçe olmalı.`
      : `${chartBrief(args.chart, locale, args.unknownTime)}

Period: ${span}. This period's computed events (don't change the dates):
${facts}

- "title": a title of at most 7 words capturing these three months.
- "text": 200-260 words. How these three months may unfold for them: which themes lead, which dates matter, how the events interact. Rely only on the events given.
- "focus": exactly 3 items, each a one-sentence focus suggestion.
Write everything in English.`;
  return { user, schemaHint: '{ "title": string, "text": string, "focus": string[] }' };
}
