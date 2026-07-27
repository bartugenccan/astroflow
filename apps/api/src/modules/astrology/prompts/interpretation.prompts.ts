import { Locale } from '../interpretation.types';
import { SIGN_RULER, Sign } from '../astrology.constants';

/**
 * Prompt builders for chart interpretation. The AI writes in the requested
 * locale; every prompt asks for strict JSON with a length cap.
 */

const PERSONA: Record<Locale, string> = {
  en: 'You are a precise, warm, non-fatalistic astrologer. Ground every statement in the specific placement given. Speak in second person ("you"). Never predict disaster, illness, death, or financial outcomes. No medical or financial advice. Write in English.',
  tr: 'Sen kesin, sıcak ve kaderci olmayan bir astrologsun. Her cümleyi verilen belirli yerleşime dayandır. İkinci tekil şahıs ("sen") kullan. Asla felaket, hastalık, ölüm veya finansal sonuç tahmin etme. Tıbbi veya finansal tavsiye verme. Türkçe yaz.',
};

export function systemPrompt(locale: Locale): string {
  return PERSONA[locale];
}

export function placementPrompt(
  locale: Locale,
  planet: string,
  sign: string,
  house: number,
  retrograde: boolean,
): { user: string; schemaHint: string } {
  const retro = retrograde ? (locale === 'tr' ? ' (retro)' : ' (retrograde)') : '';
  const user =
    locale === 'tr'
      ? `Doğum haritasında ${planet}, ${sign} burcunda ve ${house}. evde${retro}. Bu yerleşimin anlamını 60-90 kelimeyle, tek paragraf halinde açıkla.`
      : `In the natal chart, ${planet} is in ${sign} in the ${house}th house${retro}. Explain what this placement means in one paragraph of 60-90 words.`;
  return { user, schemaHint: '{ "text": string }' };
}

export function bigThreePrompt(
  locale: Locale,
  sun: string,
  moon: string,
  rising: string,
): { user: string; schemaHint: string } {
  const user =
    locale === 'tr'
      ? `Güneş ${sun}, Ay ${moon}, Yükselen ${rising}. Bu üçlünün nasıl birlikte çalıştığını anlatan bütünsel bir okuma yaz (en fazla 130 kelime, tek paragraf).`
      : `Sun in ${sun}, Moon in ${moon}, Rising ${rising}. Write a cohesive reading of how this trio works together (max 130 words, one paragraph).`;
  return { user, schemaHint: '{ "text": string }' };
}

export function aspectPrompt(
  locale: Locale,
  p1: string,
  p2: string,
  aspect: string,
  nature: 'harmonic' | 'challenging' | 'neutral',
): { user: string; schemaHint: string } {
  const en =
    nature === 'harmonic'
      ? `${p1} forms a ${aspect} (harmonic) with ${p2}. Explain the gift and the concrete potential this brings, and how to make the most of it. 70-100 words.`
      : nature === 'challenging'
        ? `${p1} forms a ${aspect} (challenging) with ${p2}. Explain the inner tension, then give concrete, practical guidance on how to work with it and what to watch out for. Be constructive, never fatalistic. 70-100 words.`
        : `${p1} forms a ${aspect} with ${p2}. Explain what it blends in the personality and how to use it well. 70-100 words.`;
  const tr =
    nature === 'harmonic'
      ? `${p1} ile ${p2} arasında ${aspect} (uyumlu) açısı var. Bunun getirdiği yeteneği ve somut potansiyeli, en iyi nasıl değerlendirileceğini açıkla. 70-100 kelime.`
      : nature === 'challenging'
        ? `${p1} ile ${p2} arasında ${aspect} (zorlayıcı) açısı var. İçsel gerilimi açıkla, sonra bununla nasıl çalışılacağına ve nelere dikkat edilmesi gerektiğine dair somut, pratik öneriler ver. Yapıcı ol, asla kaderci olma. 70-100 kelime.`
        : `${p1} ile ${p2} arasında ${aspect} açısı var. Kişilikte neyi harmanladığını ve nasıl iyi kullanılacağını açıkla. 70-100 kelime.`;
  return { user: locale === 'tr' ? tr : en, schemaHint: '{ "text": string }' };
}

export function overviewPrompt(
  locale: Locale,
  sun: string,
  moon: string,
  rising: string,
  dominantElement: string,
  dominantModality: string,
): { user: string; schemaHint: string } {
  const user =
    locale === 'tr'
      ? `Güneş ${sun}, Ay ${moon}, Yükselen ${rising}, baskın element ${dominantElement}, baskın nitelik ${dominantModality}. Bu haritanın bütününe dair kısa bir sentez yaz (en fazla 120 kelime).`
      : `Sun ${sun}, Moon ${moon}, Rising ${rising}, dominant element ${dominantElement}, dominant modality ${dominantModality}. Write a short synthesis of the whole chart (max 120 words).`;
  return { user, schemaHint: '{ "text": string }' };
}

export function dailyInsightPrompt(
  locale: Locale,
  sun: string,
  topTransits: string[],
): { user: string; schemaHint: string } {
  const transitLine = topTransits.slice(0, 4).join('; ') || 'a calm sky';
  const user =
    locale === 'tr'
      ? `Kullanıcının Güneş burcu ${sun}. Bugünkü öne çıkan transitler: ${transitLine}. Bugüne dair pratik, kaderci olmayan bir rehberlik yaz. JSON alanları: energyState (HARMONY|MOMENTUM|STRESS|OVERLOAD), title (kısa başlık), summary (2-3 cümle).`
      : `The user's Sun sign is ${sun}. Today's notable transits: ${transitLine}. Write practical, non-fatalistic guidance for today. JSON fields: energyState (HARMONY|MOMENTUM|STRESS|OVERLOAD), title (short), summary (2-3 sentences).`;
  return {
    user,
    schemaHint: '{ "energyState": "HARMONY"|"MOMENTUM"|"STRESS"|"OVERLOAD", "title": string, "summary": string }',
  };
}

const HOUSE_THEME: Record<Locale, Record<number, string>> = {
  en: {
    1: 'self, identity, body, first impressions',
    2: 'money, values, self-worth, possessions',
    3: 'communication, siblings, learning, daily mind',
    4: 'home, roots, family, emotional foundations',
    5: 'creativity, romance, children, self-expression',
    6: 'work, health, routines, service',
    7: 'partnership, marriage, close others',
    8: 'intimacy, shared resources, transformation',
    9: 'philosophy, travel, higher learning, meaning',
    10: 'career, public role, reputation, ambition',
    11: 'friends, community, hopes, networks',
    12: 'subconscious, solitude, spirituality, closure',
  },
  tr: {
    1: 'benlik, kimlik, beden, ilk izlenimler',
    2: 'para, değerler, öz değer, sahip olunanlar',
    3: 'iletişim, kardeşler, öğrenme, günlük zihin',
    4: 'ev, kökler, aile, duygusal temeller',
    5: 'yaratıcılık, aşk, çocuklar, kendini ifade',
    6: 'iş, sağlık, rutinler, hizmet',
    7: 'ortaklık, evlilik, yakın ilişkiler',
    8: 'yakınlık, ortak kaynaklar, dönüşüm',
    9: 'felsefe, seyahat, yüksek öğrenim, anlam',
    10: 'kariyer, toplumsal rol, itibar, hırs',
    11: 'arkadaşlar, topluluk, umutlar, ağlar',
    12: 'bilinçaltı, yalnızlık, maneviyat, kapanış',
  },
};

export function housePrompt(
  locale: Locale,
  args: {
    house: number;
    sign: string;
    ruler: string;
    rulerSign: string;
    rulerHouse: number;
    planetsInHouse: string[];
    planetAspects: string[];
  },
): { user: string; schemaHint: string } {
  const theme = HOUSE_THEME[locale][args.house];
  const hasPlanets = args.planetsInHouse.length > 0;
  const partner = args.house === 7;

  let user: string;
  if (locale === 'tr') {
    const planetLine = hasPlanets
      ? `Bu evdeki gezegenler: ${args.planetsInHouse.join(', ')}.${
          args.planetAspects.length ? ` Bu gezegenlerin açıları: ${args.planetAspects.join('; ')}.` : ''
        }`
      : `Bu evde gezegen yok, bu yüzden evi yöneticisi üzerinden yorumla.`;
    user =
      `${args.house}. ev (temaları: ${theme}). Ev başlangıcı ${args.sign} burcunda; geleneksel yöneticisi ${args.ruler}, ` +
      `bu yönetici ${args.rulerSign} burcunda ve ${args.rulerHouse}. evde. ${planetLine} ` +
      `Evin temalarını detaylıca yorumla: olumlu potansiyeli, ardından zorlukları ve bunları aşmak için somut öneriler ile nelere dikkat edilmesi gerektiğini belirt.` +
      (partner ? ` Bu 7. ev olduğu için, olası partner göstergelerini (7. ev yöneticisi ve burcu üzerinden) ayrıntılı açıkla.` : '') +
      ` 180-260 kelime, tek akıcı metin.`;
  } else {
    const planetLine = hasPlanets
      ? `Planets in this house: ${args.planetsInHouse.join(', ')}.${
          args.planetAspects.length ? ` Aspects of those planets: ${args.planetAspects.join('; ')}.` : ''
        }`
      : `This house is empty, so interpret it through its ruler's placement.`;
    user =
      `The ${ordinal(args.house)} house (themes: ${theme}). Its cusp is in ${args.sign}; ` +
      `its traditional ruler ${args.ruler} is in ${args.rulerSign} in the ${ordinal(args.rulerHouse)} house. ${planetLine} ` +
      `Interpret the house's themes in detail: the positive potential, then the challenges with concrete remedies and what to be careful about.` +
      (partner ? ` Because this is the 7th house, analyze potential-partner indicators in detail (via the 7th-house ruler and its sign).` : '') +
      ` 180-260 words, one flowing text.`;
  }
  return { user, schemaHint: '{ "text": string }' };
}

export function nodesPrompt(
  locale: Locale,
  args: { northSign: string; northHouse: number; southSign: string; southHouse: number },
): { user: string; schemaHint: string } {
  const northRuler = SIGN_RULER[args.northSign as Sign];
  const southRuler = SIGN_RULER[args.southSign as Sign];
  const northTheme = HOUSE_THEME[locale][args.northHouse];
  const southTheme = HOUSE_THEME[locale][args.southHouse];

  const user =
    locale === 'tr'
      ? `Ay Düğümleri ekseni: Güney Ay Düğümü ${args.southSign} burcunda ${args.southHouse}. evde (yaşam alanı: ${southTheme}; burç yöneticisi ${southRuler}); ` +
        `Kuzey Ay Düğümü ${args.northSign} burcunda ${args.northHouse}. evde (yaşam alanı: ${northTheme}; burç yöneticisi ${northRuler}). ` +
        `Bu iki nokta bir eksen oluşturur ve dengelenmesi gereken bir kutupluluğu temsil eder. ` +
        `1) Güney Düğüm: geçmişten gelen tanıdık ama aşırıya kaçıldığında tıkayan kalıpları ve bu evin/burcun temalarında nelerin bırakılması gerektiğini açıkla. ` +
        `2) Kuzey Düğüm: bu yaşamdaki büyüme yönünü, bu ev ve burcun temsil ettiği yaşam alanında geliştirilmesi gereken nitelikleri açıkla. ` +
        `3) Kişinin somut olarak neler yapabileceğine dair birkaç net öneri ver. 200-280 kelime, tek akıcı metin.`
      : `The lunar nodal axis: South Node in ${args.southSign} in the ${ordinal(args.southHouse)} house (life area: ${southTheme}; sign ruler ${southRuler}); ` +
        `North Node in ${args.northSign} in the ${ordinal(args.northHouse)} house (life area: ${northTheme}; sign ruler ${northRuler}). ` +
        `These two points form an axis — a polarity to balance. ` +
        `1) South Node: describe the familiar past patterns (comfortable but limiting when overused) and, specifically within this house/sign's themes, what to release. ` +
        `2) North Node: describe this life's growth direction and the qualities to develop in the life area this house and sign represent. ` +
        `3) Give a few concrete things the person can actually do. 200-280 words, one flowing text.`;
  return { user, schemaHint: '{ "text": string }' };
}

export function transitDetailPrompt(
  locale: Locale,
  args: {
    planet: string;
    sign: string;
    natalHouse: number;
    daysInHouse: number;
    retrograde: boolean;
    aspects: { natalPlanet: string; aspect: string; nature: string }[];
  },
): { user: string; schemaHint: string } {
  const theme = HOUSE_THEME[locale][args.natalHouse];
  const duration = durationPhrase(args.daysInHouse, locale);

  if (locale === 'tr') {
    const aspectLine = args.aspects.length
      ? `Doğum gezegenlerinle kurduğu açılar: ${args.aspects
          .map(
            (a) =>
              `${args.planet}–${a.natalPlanet} ${a.aspect.toLowerCase()} (${
                a.nature === 'harmonic' ? 'uyumlu' : a.nature === 'challenging' ? 'zorlayıcı' : 'nötr'
              })`,
          )
          .join('; ')}.`
      : 'Şu an doğum gezegenlerinle kesin bir açı kurmuyor.';
    const user =
      `Transit ${args.planet}, şu an ${args.sign} burcunda ve doğum haritanın ${args.natalHouse}. evinden geçiyor (bu evin temaları: ${theme})${
        args.retrograde ? ' ve retro hareket ediyor' : ''
      }. Bu evde yaklaşık ${duration} kalacak. ${aspectLine} ` +
      `Bu transitin kişiyi nasıl etkilediğini açıkla: hangi yaşam alanının aktive olduğunu, sunduğu fırsatları, zorlukları ve nelere dikkat edilmesi gerektiğini, ` +
      `bu enerjiyle uyumlu çalışmak için somut olarak ne yapılabileceğini ve etkinin yaklaşık ne kadar süreceğini belirt. 180-260 kelime, tek akıcı metin.`;
    return { user, schemaHint: '{ "text": string }' };
  }

  const aspectLine = args.aspects.length
    ? `Aspects to your natal planets: ${args.aspects
        .map((a) => `${args.planet} ${a.aspect.toLowerCase()} natal ${a.natalPlanet} (${a.nature})`)
        .join('; ')}.`
    : 'It makes no exact aspect to your natal planets right now.';
  const user =
    `Transiting ${args.planet} is currently in ${args.sign}, moving through your natal ${ordinal(
      args.natalHouse,
    )} house (themes: ${theme})${args.retrograde ? ', and is retrograde' : ''}. ` +
    `It will stay in this house for approximately ${duration}. ${aspectLine} ` +
    `Explain how this transit affects the person: the area of life it activates, the opportunities it opens, the challenges and what to be mindful of, ` +
    `what to do to work with the energy, and roughly how long the influence lasts. 180-260 words, one flowing text.`;
  return { user, schemaHint: '{ "text": string }' };
}

export function transitOverviewPrompt(
  locale: Locale,
  args: {
    date: string;
    highlights: string[]; // personal transit summaries
    skyAspects: { planet1: string; planet2: string; aspect: string; nature: string }[];
  },
): { user: string; schemaHint: string } {
  const skyLine =
    args.skyAspects
      .slice(0, 5)
      .map((a) => `${a.planet1} ${a.aspect.toLowerCase()} ${a.planet2}`)
      .join('; ') || (locale === 'tr' ? 'sakin bir gökyüzü' : 'a calm sky');
  const personal = args.highlights.slice(0, 6).join('; ') || (locale === 'tr' ? '—' : '—');

  const user =
    locale === 'tr'
      ? `Bugünün gökyüzü (${args.date}). Şu anki belirgin gezegen açıları: ${skyLine}. ` +
        `Kişinin haritasındaki öne çıkan transitler: ${personal}. ` +
        `Bugünkü gökyüzünün genel havasını yaz: genel ruh hali, değerlendirilecek fırsatlar ve nelere dikkat edilmesi gerektiği. 150-220 kelime, tek akıcı metin.`
      : `Today's sky (${args.date}). Notable current planetary alignments: ${skyLine}. ` +
        `The person's standout transits: ${personal}. ` +
        `Write an overview of the current sky's weather: the overall mood, the opportunities to lean into, and what to be mindful of today. 150-220 words, one flowing text.`;
  return { user, schemaHint: '{ "text": string }' };
}

/** Human-friendly, localized duration bucket used inside transit prompts. */
function durationPhrase(days: number, locale: Locale): string {
  const d = Math.max(0, Math.round(days));
  if (locale === 'tr') {
    if (d <= 1) return 'yaklaşık 1 gün';
    if (d < 14) return `yaklaşık ${d} gün`;
    if (d < 60) return `yaklaşık ${Math.round(d / 7)} hafta`;
    if (d < 365) return `yaklaşık ${Math.round(d / 30)} ay`;
    return `yaklaşık ${(d / 365).toFixed(1)} yıl`;
  }
  if (d <= 1) return 'about 1 day';
  if (d < 14) return `about ${d} days`;
  if (d < 60) return `about ${Math.round(d / 7)} weeks`;
  if (d < 365) return `about ${Math.round(d / 30)} months`;
  return `about ${(d / 365).toFixed(1)} years`;
}

export function chartContextPrompt(
  locale: Locale,
  args: { sect: 'day' | 'night'; saturnSign: string; saturnHouse: number; saturnReturnAge: number },
): { user: string; schemaHint: string } {
  const user =
    locale === 'tr'
      ? `Bu bir ${args.sect === 'day' ? 'gündüz' : 'gece'} haritası (Güneş ufkun ${args.sect === 'day' ? 'üstünde' : 'altında'}). Bunun kişilik için ne anlama geldiğini açıkla. ` +
        `Ayrıca Satürn ${args.saturnSign} burcunda ${args.saturnHouse}. evde; ilk Satürn dönüşü yaklaşık ${args.saturnReturnAge} yaşında yaşanır. ` +
        `Satürn dönüşünde bu kişinin karşılaşabileceği zorlukları ve olgunlaşma temalarını somut olarak açıkla. 130-190 kelime.`
      : `This is a ${args.sect} chart (the Sun is ${args.sect === 'day' ? 'above' : 'below'} the horizon). Explain what that means for the personality. ` +
        `Also, Saturn is in ${args.saturnSign} in the ${ordinal(args.saturnHouse)} house; the first Saturn return happens around age ${args.saturnReturnAge}. ` +
        `Explain, concretely, the challenges and maturation themes this person may face at their Saturn return. 130-190 words.`;
  return { user, schemaHint: '{ "text": string }' };
}

const SYNASTRY_DIM_LABEL: Record<Locale, Record<string, string>> = {
  en: {
    attraction: 'attraction', intimacy: 'emotional intimacy', communication: 'communication',
    values: 'shared values', commitment: 'commitment', conflict: 'conflict', enmeshment: 'enmeshment',
  },
  tr: {
    attraction: 'çekim', intimacy: 'duygusal yakınlık', communication: 'iletişim',
    values: 'ortak değerler', commitment: 'bağlılık', conflict: 'çatışma', enmeshment: 'aşırı bağımlılık',
  },
};

export function compatibilityPrompt(
  locale: Locale,
  args: {
    selfSun: string;
    selfMoon: string;
    otherSun: string;
    otherMoon: string;
    overall: number;
    dimensions: { key: string; value: number; lowerIsBetter: boolean }[];
    topAspects: { planetA: string; planetB: string; aspect: string; nature: string }[];
  },
): { user: string; schemaHint: string } {
  const aspectLine =
    args.topAspects
      .slice(0, 6)
      .map((a) => `${a.planetA}–${a.planetB} ${a.aspect.toLowerCase()} (${a.nature})`)
      .join('; ') || (locale === 'tr' ? 'belirgin bir açı yok' : 'no standout contacts');

  const dimLine = args.dimensions
    .map((d) => {
      const label = SYNASTRY_DIM_LABEL[locale][d.key] ?? d.key;
      const note = d.lowerIsBetter
        ? locale === 'tr' ? ' (düşük daha iyi)' : ' (lower is better)'
        : '';
      return `${label} ${d.value}/100${note}`;
    })
    .join(', ');

  const user =
    locale === 'tr'
      ? `İki kişi arasındaki sinastri (ilişki uyumu). Kişi A: Güneş ${args.selfSun}, Ay ${args.selfMoon}. Kişi B: Güneş ${args.otherSun}, Ay ${args.otherMoon}. ` +
        `Genel uyum ${args.overall}/100. Boyut skorları: ${dimLine}. ` +
        `En güçlü açılar: ${aspectLine}. ` +
        `Not: "çatışma" ve "aşırı bağımlılık" boyutlarında DÜŞÜK skor daha sağlıklıdır; yüksekse dikkatle ele al. ` +
        `İkinci tekil şahısla ("siz/ilişkiniz") sıcak, kaderci olmayan, detaylı bir okuma yaz: 1) genel dinamik, 2) en güçlü boyutlar ve bağlar, 3) en zorlu boyut(lar) ve bununla yapıcı biçimde nasıl çalışılacağı. ` +
        `Skorlarla tutarlı ol. 180-260 kelime. Ayrıca paylaşıma uygun kısa bir başlık (headline, en fazla 8 kelime) üret.`
      : `Synastry (relationship compatibility) between two people. Person A: Sun ${args.selfSun}, Moon ${args.selfMoon}. Person B: Sun ${args.otherSun}, Moon ${args.otherMoon}. ` +
        `Overall ${args.overall}/100. Dimension scores: ${dimLine}. ` +
        `Strongest contacts: ${aspectLine}. ` +
        `Note: for the "conflict" and "enmeshment" dimensions a LOW score is healthier; if high, address it carefully. ` +
        `Write a warm, non-fatalistic, detailed reading in second person ("you two / your relationship"): 1) the overall dynamic, 2) the strongest dimensions and bonds, 3) the hardest dimension(s) and how to work with them constructively. ` +
        `Stay consistent with the scores. 180-260 words. Also produce a short shareable headline (max 8 words).`;

  return {
    user,
    schemaHint: '{ "text": string, "headline": string }',
  };
}

const AREA_LABEL: Record<Locale, Record<string, string>> = {
  en: { love: 'love & relationships', career: 'career & ambition', money: 'money & resources', energy: 'energy & vitality' },
  tr: { love: 'aşk & ilişkiler', career: 'kariyer & hedefler', money: 'para & kaynaklar', energy: 'enerji & canlılık' },
};

export function forecastPrompt(
  locale: Locale,
  args: {
    period: 'weekly' | 'monthly';
    start: string;
    end: string;
    sun: string;
    transits: string[]; // tightest natal transit summaries
    ingresses: string[]; // "Venus enters Cancer ~May 8"
    stations: string[]; // "Mercury turns retrograde"
    keyDates: string[]; // "May 8 — strong day for love"
  },
): { user: string; schemaHint: string } {
  const periodEn = args.period === 'weekly' ? 'week' : 'month';
  const periodTr = args.period === 'weekly' ? 'hafta' : 'ay';
  const bullet = (arr: string[], empty: string) => (arr.length ? arr.join('; ') : empty);

  const user =
    locale === 'tr'
      ? `Güneş burcu ${args.sun} olan biri için ${args.start} ile ${args.end} arasındaki ${periodTr} için astrolojik öngörü. ` +
        `Öne çıkan transitler: ${bullet(args.transits, 'sakin bir dönem')}. ` +
        `Burç geçişleri: ${bullet(args.ingresses, 'yok')}. Retro/duraklama: ${bullet(args.stations, 'yok')}. ` +
        `Öne çıkan tarihler: ${bullet(args.keyDates, 'yok')}. ` +
        `JSON üret: overview (bu dönemin genel havası, 2-3 cümle), themes (aşk, kariyer, para, enerji alanlarının her biri için 1-2 cümle somut rehberlik), keyDates (2-4 önemli tarih ve kısa etiketi). Kaderci olma, pratik ol.`
      : `Astrological forecast for the ${periodEn} of ${args.start} to ${args.end}, for someone with Sun in ${args.sun}. ` +
        `Standout transits: ${bullet(args.transits, 'a calm stretch')}. ` +
        `Sign ingresses: ${bullet(args.ingresses, 'none')}. Retrogrades/stations: ${bullet(args.stations, 'none')}. ` +
        `Key dates: ${bullet(args.keyDates, 'none')}. ` +
        `Produce JSON: overview (the overall weather of this period, 2-3 sentences), themes (1-2 sentences of concrete guidance for each of love, career, money, energy), keyDates (2-4 notable dates with a short label). Be practical, never fatalistic.`;

  const areas = AREA_LABEL[locale];
  return {
    user,
    schemaHint: `{ "overview": string, "themes": [{ "area": "love"|"career"|"money"|"energy", "text": string }], "keyDates": [{ "date": "YYYY-MM-DD", "label": string }] } — cover all four areas: ${Object.values(areas).join(', ')}`,
  };
}

const GUIDANCE_TOPIC_LABEL: Record<Locale, Record<string, string>> = {
  en: {
    love: 'love & relationships', work: 'work & career', money: 'money',
    decision: 'a decision they are weighing', person: 'someone in their life',
    mood: 'their mood & energy today', general: 'their day overall',
  },
  tr: {
    love: 'aşk & ilişkiler', work: 'iş & kariyer', money: 'para',
    decision: 'tartmakta olduğu bir karar', person: 'hayatındaki biri',
    mood: 'bugünkü ruh hali & enerjisi', general: 'günü genel olarak',
  },
};

export function guidancePrompt(
  locale: Locale,
  args: {
    topic: string;
    sun: string;
    moon: string;
    transits: string[]; // today's standout transit lines
    memory?: string;
  },
): { user: string; schemaHint: string } {
  const label = GUIDANCE_TOPIC_LABEL[locale][args.topic] ?? args.topic;
  const transitLine = args.transits.slice(0, 5).join('; ') || (locale === 'tr' ? 'sakin bir gökyüzü' : 'a calm sky');
  const mem = args.memory
    ? locale === 'tr'
      ? ` Kişi hakkında hatırlananlar:\n${args.memory}\n`
      : ` What we remember about them:\n${args.memory}\n`
    : '';

  const user =
    locale === 'tr'
      ? `Kullanıcı bugün "${label}" konusunda ne olduğunu merak ediyor. Güneş ${args.sun}, Ay ${args.moon}. Bugünkü öne çıkan transitler: ${transitLine}.${mem} ` +
        `Astrolojiyi GİZLİ motor olarak kullan: yanıtta jargon (burç/ev/açı adı) KULLANMA. ` +
        `JSON üret: takeaway (tek cümlelik, sade, uygulanabilir çıkarım — örn. "Bugün daha sosyal hissedeceksin, bunu kullan"), why (bunu hangi göksel etkinin desteklediğini sade dille açıkla, 1-2 cümle), actions (1-3 somut küçük öneri).`
      : `The user wants to know about "${label}" today. Sun ${args.sun}, Moon ${args.moon}. Today's standout transits: ${transitLine}.${mem} ` +
        `Use astrology as the INVISIBLE engine: do NOT use jargon (no sign/house/aspect names) in the answer. ` +
        `Produce JSON: takeaway (one plain, actionable sentence — e.g. "You'll feel more social today, use it"), why (plain-language explanation of what's driving it, 1-2 sentences), actions (1-3 small concrete suggestions).`;

  return {
    user,
    schemaHint: '{ "takeaway": string, "why": string, "actions": string[] }',
  };
}

export function affirmationPrompt(
  locale: Locale,
  args: { goalText: string; lifeArea: string; moonSign: string },
): { user: string; schemaHint: string } {
  const user =
    locale === 'tr'
      ? `Kullanıcının hedefi: "${args.goalText}". Duygusal tonu Ay burcu ${args.moonSign} ile uyumlu olsun (ama burç adını YAZMA). ` +
        `Bu hedefi destekleyen, birinci tekil şahıs, şimdiki zaman, KISA ve İNANILIR bir olumlama (affirmation) yaz — kişinin gerçekten inanabileceği, abartısız, jargonsuz tek cümle. ` +
        `JSON üret: { "affirmation": string }.`
      : `The user's goal: "${args.goalText}". Match the emotional tone to their Moon sign ${args.moonSign} (but do NOT name the sign). ` +
        `Write a SHORT, BELIEVABLE affirmation supporting this goal — first person, present tense, one sentence the person can actually believe (no hype, no jargon). ` +
        `Produce JSON: { "affirmation": string }.`;
  return { user, schemaHint: '{ "affirmation": string }' };
}

export function checkInPrompt(
  locale: Locale,
  args: {
    goalText: string;
    affirmation: string;
    conviction: number; // 1-5 self-rating
    userText?: string;
    recent?: string; // recent check-in memory
  },
): { user: string; schemaHint: string } {
  const mem = args.recent
    ? locale === 'tr'
      ? `Son check-in'lerden notlar:\n${args.recent}\n`
      : `Notes from recent check-ins:\n${args.recent}\n`
    : '';
  const said = args.userText
    ? locale === 'tr'
      ? `Kişi şunu yazdı: "${args.userText}".`
      : `They wrote: "${args.userText}".`
    : locale === 'tr'
      ? 'Kişi bir not yazmadı.'
      : 'They wrote no note.';

  const user =
    locale === 'tr'
      ? `Bir arkadaş gibi, kişinin "${args.goalText}" hedefindeki günlük olumlamasına ("${args.affirmation}") yaptığı check-in'e yanıt ver. ` +
        `Kişinin kendi inanç puanı: ${args.conviction}/5. ${said}\n${mem}` +
        `Kişinin YAZDIĞI dile bakarak inancını değerlendir: tereddüt, olumsuzlama, belirsizlik ("herhalde", "belki", "denerim") düşük inanç; birinci tekil, kararlı, somut ifade yüksek inanç. ` +
        `Yargılamadan, sıcak ve yapıcı ol. JSON üret: response (kısa, destekleyici yanıt), conviction (senin tahminin 1-5), followUp (kısa bir soru veya küçük öneri), strongerPhrasing (isteğe bağlı: daha inandırıcı bir olumlama önerisi).`
      : `Like a friend, respond to the user's check-in on their daily affirmation ("${args.affirmation}") for the goal "${args.goalText}". ` +
        `Their self-rated conviction: ${args.conviction}/5. ${said}\n${mem}` +
        `Judge conviction from the LANGUAGE they wrote: hedging, negation, vagueness ("I guess", "maybe", "I'll try") = low belief; first-person, decisive, concrete = high belief. ` +
        `Be warm and constructive, never judgmental. Produce JSON: response (short supportive reply), conviction (your estimate 1-5), followUp (a short question or small suggestion), strongerPhrasing (optional: a more believable rewrite of the affirmation).`;

  return {
    user,
    schemaHint:
      '{ "response": string, "conviction": number, "followUp": string, "strongerPhrasing"?: string }',
  };
}

export function intentionSuggestionsPrompt(
  locale: Locale,
  args: { sun: string; moon: string; transits: string[]; memory?: string },
): { user: string; schemaHint: string } {
  const transitLine =
    args.transits.slice(0, 6).join('; ') || (locale === 'tr' ? 'sakin bir gökyüzü' : 'a calm sky');
  const mem = args.memory ? (locale === 'tr' ? `\nHatırlananlar:\n${args.memory}` : `\nRemembered:\n${args.memory}`) : '';
  const user =
    locale === 'tr'
      ? `Güneş ${args.sun}, Ay ${args.moon}. Bugünkü transitler kişinin şu an neyle uğraştığını gösteriyor: ${transitLine}.${mem} ` +
        `Bu ana uygun, sade dille 3 kısa "niyet" (hedef) öner — jargon yok. Her biri için: goal (kısa hedef ifadesi), why (neden şimdi uygun, sade), lifeArea ('love'|'career'|'money'|'energy'). JSON: { "suggestions": [{goal, why, lifeArea}] }.`
      : `Sun ${args.sun}, Moon ${args.moon}. Today's transits show what the person is dealing with now: ${transitLine}.${mem} ` +
        `Suggest 3 short, plain-language "intentions" (goals) that fit this moment — no jargon. For each: goal (short goal phrase), why (why it fits now, plain), lifeArea ('love'|'career'|'money'|'energy'). JSON: { "suggestions": [{goal, why, lifeArea}] }.`;
  return {
    user,
    schemaHint:
      '{ "suggestions": [{ "goal": string, "why": string, "lifeArea": "love"|"career"|"money"|"energy" }] }',
  };
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
