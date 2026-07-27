import {
  Locale,
  EnergyState,
  CompatibilityReading,
  Forecast,
  ForecastPeriod,
  GuidanceAnswer,
} from '../interpretation.types';

/**
 * Deterministic, non-AI fallback copy so the app is fully functional with no
 * API key (dev). Concise but grounded in the actual placement.
 */

export function placementStub(
  locale: Locale,
  planet: string,
  sign: string,
  house: number,
  retrograde: boolean,
): string {
  const retro =
    retrograde && locale === 'tr'
      ? ' Retro hareketi, bu enerjiyi içe dönük biçimde yaşamana işaret eder.'
      : retrograde
        ? ' Its retrograde motion turns this energy inward and reflective.'
        : '';
  return locale === 'tr'
    ? `${planet} ${sign} burcunda ve ${house}. evde. Bu yerleşim, ${sign} niteliklerini yaşamının ${house}. ev alanında ifade etme eğilimini gösterir.${retro}`
    : `${planet} sits in ${sign} in your ${house}th house. This placement colors how you express ${sign} qualities within the affairs of the ${house}th house.${retro}`;
}

export function bigThreeStub(
  locale: Locale,
  sun: string,
  moon: string,
  rising: string,
): string {
  return locale === 'tr'
    ? `Güneşin ${sun}, Ayın ${moon}, yükselenin ${rising}. Özün ${sun}, duygusal dünyan ${moon} tarafından şekillenir; dünyaya ${rising} maskesiyle çıkarsın.`
    : `Your Sun is in ${sun}, Moon in ${moon}, and Rising in ${rising}. Your core is ${sun}, your inner world is shaped by ${moon}, and you meet the world through a ${rising} lens.`;
}

export function aspectStub(
  locale: Locale,
  p1: string,
  p2: string,
  aspect: string,
  nature: 'harmonic' | 'challenging' | 'neutral' = 'neutral',
): string {
  if (nature === 'challenging') {
    return locale === 'tr'
      ? `${p1} ile ${p2} arasındaki ${aspect} açısı bir gerilim yaratır; bu enerjileri bilinçli biçimde dengelediğinde büyümeye dönüşür. Acele etme ve aşırılıklardan kaçın.`
      : `The ${aspect} between ${p1} and ${p2} creates a tension that becomes growth when you balance these energies consciously. Avoid rushing or extremes.`;
  }
  if (nature === 'harmonic') {
    return locale === 'tr'
      ? `${p1} ile ${p2} arasındaki ${aspect} açısı doğal bir yetenek ve akış getirir; bunu bilinçli kullandığında güçlü bir potansiyele dönüşür.`
      : `The ${aspect} between ${p1} and ${p2} brings a natural talent and flow; used consciously it becomes a real strength.`;
  }
  return locale === 'tr'
    ? `${p1} ile ${p2} arasındaki ${aspect} açısı, bu iki gezegenin enerjilerinin haritanda belirgin bir şekilde harmanlanmasına yol açar.`
    : `The ${aspect} between ${p1} and ${p2} blends these two energies in a defining way within your chart.`;
}

export function overviewStub(
  locale: Locale,
  sun: string,
  dominantElement: string,
  dominantModality: string,
): string {
  return locale === 'tr'
    ? `Haritanda ${dominantElement} elementi ve ${dominantModality} niteliği baskın. ${sun} Güneşin, bu dengeye kişisel bir yön ve amaç katıyor.`
    : `Your chart leans toward the ${dominantElement} element and a ${dominantModality} modality. Your ${sun} Sun gives this balance a personal direction and purpose.`;
}

export function dailyInsightStub(
  locale: Locale,
  energyState: EnergyState,
): { energyState: EnergyState; title: string; summary: string } {
  const copy: Record<EnergyState, Record<Locale, { title: string; summary: string }>> = {
    HARMONY: {
      en: { title: 'A day that flows', summary: 'The sky favours ease today. Trust the openings that appear and let one meaningful connection deepen.' },
      tr: { title: 'Akan bir gün', summary: 'Gökyüzü bugün rahatlıktan yana. Önüne çıkan açıklıklara güven ve anlamlı bir bağı derinleştir.' },
    },
    MOMENTUM: {
      en: { title: 'Energy wants direction', summary: "There's fuel in the air — channel it into one decisive move rather than many scattered ones." },
      tr: { title: 'Enerji yön arıyor', summary: 'Havada bir yakıt var — onu dağınık hamleler yerine tek ve kararlı bir adıma yönlendir.' },
    },
    STRESS: {
      en: { title: 'Soften your pace', summary: 'Friction in the transits asks for patience, not force. Protect your focus and let the tension pass.' },
      tr: { title: 'Temponu yumuşat', summary: 'Transitlerdeki gerilim güç değil sabır istiyor. Odağını koru ve gerilimin geçmesine izin ver.' },
    },
    OVERLOAD: {
      en: { title: 'Return to the ground', summary: 'The signals are loud today. Do less, breathe slower, and choose rest over reaction.' },
      tr: { title: 'Yeniden yere dön', summary: 'Sinyaller bugün yüksek. Daha az yap, daha yavaş nefes al ve tepki yerine dinlenmeyi seç.' },
    },
  };
  const c = copy[energyState][locale];
  return { energyState, title: c.title, summary: c.summary };
}

export function houseStub(
  locale: Locale,
  house: number,
  sign: string,
  ruler: string,
  rulerSign: string,
  rulerHouse: number,
  planetsInHouse: string[],
): string {
  const hasP = planetsInHouse.length > 0;
  if (locale === 'tr') {
    return hasP
      ? `${house}. evin başlangıcı ${sign} burcunda ve içinde ${planetsInHouse.join(', ')} yer alıyor. Bu, evin temalarını bu gezegenlerin enerjisiyle yaşamana işaret eder. Yöneticisi ${ruler}, ${rulerSign} burcunda ${rulerHouse}. evde, bu alana renk katar.`
      : `${house}. evin başlangıcı ${sign} burcunda; içinde gezegen yok, bu yüzden yöneticisi ${ruler} üzerinden okunur. ${ruler} ${rulerSign} burcunda ${rulerHouse}. evde olduğundan, bu evin temaları o alanla bağlantılı gelişir.`;
  }
  return hasP
    ? `The ${house}th house begins in ${sign} and holds ${planetsInHouse.join(', ')}, so you live its themes through those planets. Its ruler ${ruler} in ${rulerSign} in the ${rulerHouse}th house colors this area of life.`
    : `The ${house}th house begins in ${sign} and is empty, so it is read through its ruler ${ruler}. With ${ruler} in ${rulerSign} in the ${rulerHouse}th house, this house's themes unfold through that area of life.`;
}

export function nodesStub(
  locale: Locale,
  northSign: string,
  northHouse: number,
  southSign: string,
  southHouse: number,
): string {
  return locale === 'tr'
    ? `Güney Ay Düğümün ${southSign} burcunda ${southHouse}. evde — geçmişten gelen tanıdık ama aşman gereken kalıplar burada. Kuzey Ay Düğümün ${northSign} burcunda ${northHouse}. evde, bu yaşamdaki büyüme yönünü gösterir.`
    : `Your South Node is in ${southSign} in the ${southHouse}th house — familiar patterns from the past to grow beyond. Your North Node in ${northSign} in the ${northHouse}th house points to this life's direction of growth.`;
}

export function chartContextStub(
  locale: Locale,
  sect: 'day' | 'night',
  saturnSign: string,
  saturnHouse: number,
  saturnReturnAge: number,
): string {
  return locale === 'tr'
    ? `Bu bir ${sect === 'day' ? 'gündüz' : 'gece'} haritası. Satürn ${saturnSign} burcunda ${saturnHouse}. evde; ilk Satürn dönüşün yaklaşık ${saturnReturnAge} yaşında olgunluk ve sorumluluk temalarını gündeme getirir.`
    : `This is a ${sect} chart. Saturn is in ${saturnSign} in the ${saturnHouse}th house; your first Saturn return around age ${saturnReturnAge} brings themes of maturity and responsibility.`;
}

export function transitDetailStub(
  locale: Locale,
  planet: string,
  sign: string,
  natalHouse: number,
  retrograde: boolean,
): string {
  return locale === 'tr'
    ? `Transit ${planet} şu an ${sign} burcunda ve doğum haritanın ${natalHouse}. evinden geçiyor${
        retrograde ? ' (retro)' : ''
      }. Bu, o evin yaşam alanlarını bir süreliğine öne çıkarır; fırsatları değerlendir, gerilimlerde ise sabırlı ol.`
    : `Transiting ${planet} is in ${sign}, moving through your natal ${natalHouse}th house${
        retrograde ? ' (retrograde)' : ''
      }. It highlights that area of life for a while — lean into the openings and stay patient where it brings friction.`;
}

export function transitOverviewStub(locale: Locale, date: string): string {
  return locale === 'tr'
    ? `${date} için gökyüzü sakin ve dengeli. Bugünü küçük, kararlı adımlar için kullan; enerjini dağıtmadan tek bir önceliğe yönel.`
    : `The sky for ${date} is calm and balanced. Use today for small, deliberate steps — focus on one priority rather than scattering your energy.`;
}

export function compatibilityStub(
  locale: Locale,
  overall: number,
  dimensions: { key: string; value: number; lowerIsBetter: boolean }[],
): CompatibilityReading {
  // Strongest = highest positive dim; hardest = highest lower-is-better dim.
  const positives = dimensions.filter((d) => !d.lowerIsBetter);
  const negatives = dimensions.filter((d) => d.lowerIsBetter);
  const strong = [...positives].sort((a, b) => b.value - a.value)[0]?.key ?? 'attraction';
  const hardest = [...negatives].sort((a, b) => b.value - a.value)[0];

  const label = (k: string) =>
    (locale === 'tr'
      ? {
          attraction: 'çekim', intimacy: 'duygusal yakınlık', communication: 'iletişim',
          values: 'ortak değerler', commitment: 'bağlılık', conflict: 'çatışma', enmeshment: 'aşırı bağımlılık',
        }
      : {
          attraction: 'attraction', intimacy: 'emotional intimacy', communication: 'communication',
          values: 'shared values', commitment: 'commitment', conflict: 'conflict', enmeshment: 'enmeshment',
        })[k] ?? k;

  return locale === 'tr'
    ? {
        text: `Genel uyumunuz ${overall}/100. En güçlü boyutunuz ${label(strong)}. Bağınız gerçek bir potansiyel taşıyor; ${hardest ? `${label(hardest.key)} (${hardest.value}/100) alanında ise` : 'zorlu anlarda'} sabır ve açık iletişim en iyi araçlarınız olacak. Farklılıklarınızı bir tehdit değil, birbirinizi tamamlayan bir denge olarak görün.`,
        headline: `Uyum ${overall}/100 — ${label(strong)}`,
      }
    : {
        text: `Your overall compatibility is ${overall}/100. Your strongest dimension is ${label(strong)}. The bond carries real potential; ${hardest ? `in ${label(hardest.key)} (${hardest.value}/100)` : 'in harder moments'} patience and open communication are your best tools. See your differences as a balance that completes each other, not a threat.`,
        headline: `${overall}/100 — strong in ${label(strong)}`,
      };
}

export function guidanceStub(locale: Locale, topic: string): GuidanceAnswer {
  const copy: Record<string, Record<Locale, { takeaway: string; why: string; actions: string[] }>> = {
    love: {
      en: { takeaway: "Lead with warmth today — a small gesture lands well.", why: "The current sky softens your connections and makes sincerity easy to receive.", actions: ["Reach out to one person you care about.", "Say the kind thing you'd normally hold back."] },
      tr: { takeaway: "Bugün sıcaklıkla yaklaş — küçük bir jest iyi karşılık bulur.", why: "Şu anki gökyüzü bağlarını yumuşatıyor ve içtenliğin kolayca karşılık buluyor.", actions: ["Değer verdiğin birine ulaş.", "Normalde tuttuğun o güzel sözü söyle."] },
    },
    work: {
      en: { takeaway: "Pick one priority and protect your focus.", why: "Energy favours steady, single-tracked effort over juggling.", actions: ["Choose the one task that matters most.", "Silence one distraction for an hour."] },
      tr: { takeaway: "Tek bir önceliği seç ve odağını koru.", why: "Enerji, dağınık uğraş yerine istikrarlı ve tek yönlü çabayı destekliyor.", actions: ["En önemli tek işi seç.", "Bir saatliğine bir dikkat dağıtıcıyı sustur."] },
    },
    general: {
      en: { takeaway: "A steady day — move deliberately and you'll feel good about it.", why: "Nothing is pushing hard right now, so small intentional steps go far.", actions: ["Do one thing you've been putting off.", "Give yourself a real break."] },
      tr: { takeaway: "Dengeli bir gün — kararlı hareket et, kendini iyi hissedeceksin.", why: "Şu an zorlayan bir şey yok, bu yüzden küçük ve bilinçli adımlar ileri götürür.", actions: ["Ertelediğin bir şeyi yap.", "Kendine gerçek bir mola ver."] },
    },
  };
  const c = (copy[topic] ?? copy.general)[locale];
  return { topic, takeaway: c.takeaway, why: c.why, actions: c.actions };
}

export function affirmationStub(locale: Locale, goalText: string): string {
  return locale === 'tr'
    ? `Her gün "${goalText}" hedefime doğru küçük, kararlı bir adım atıyorum.`
    : `Each day I take one small, steady step toward "${goalText}".`;
}

export function checkInStub(
  locale: Locale,
  conviction: number,
): { response: string; conviction: number; followUp: string } {
  return locale === 'tr'
    ? {
        response: 'Bugün göründüğün için teşekkürler — devam etmek, mükemmel olmaktan daha önemli.',
        conviction,
        followUp: 'Bu niyeti bugün gerçek kılan tek küçük şey ne olabilir?',
      }
    : {
        response: "Thanks for showing up today — consistency matters more than being perfect.",
        conviction,
        followUp: 'What one small thing could make this intention real today?',
      };
}

export function intentionSuggestionsStub(
  locale: Locale,
): { suggestions: { goal: string; why: string; lifeArea: 'love' | 'career' | 'money' | 'energy' }[] } {
  return locale === 'tr'
    ? {
        suggestions: [
          { goal: 'Her gün 10 dakika kendime ayırmak', why: 'Şu an sakinliğe alan açmak sana iyi gelir.', lifeArea: 'energy' },
          { goal: 'Bir işi sonuna kadar bitirmek', why: 'İstikrarlı çaba bu dönemde ödüllendiriliyor.', lifeArea: 'career' },
          { goal: 'Sevdiğim birine ulaşmak', why: 'Bir bağı derinleştirmek için uygun bir zaman.', lifeArea: 'love' },
        ],
      }
    : {
        suggestions: [
          { goal: 'Take 10 quiet minutes for myself each day', why: 'Making room for calm serves you right now.', lifeArea: 'energy' },
          { goal: 'Finish one thing I keep putting off', why: 'Steady effort is rewarded this stretch.', lifeArea: 'career' },
          { goal: 'Reach out to someone I care about', why: "It's a good time to deepen a connection.", lifeArea: 'love' },
        ],
      };
}

/** Fallback companion chat reply when there's no API key. */
export function companionStub(locale: Locale): { reply: string } {
  return {
    reply:
      locale === 'tr'
        ? 'Şu an sana tam olarak bağlanamadım, ama buradayım. Aklından geçeni biraz daha anlatır mısın?'
        : "I couldn't fully reach the stars just now, but I'm here. Tell me a little more about what's on your mind?",
  };
}

export function forecastStub(
  locale: Locale,
  period: ForecastPeriod,
  start: string,
): Forecast {
  const p = period === 'weekly' ? (locale === 'tr' ? 'hafta' : 'week') : locale === 'tr' ? 'ay' : 'month';
  const themes: Forecast['themes'] =
    locale === 'tr'
      ? [
          { area: 'love', text: 'İlişkilerde açık iletişime alan aç; küçük jestler bu dönemde büyük fark yaratır.' },
          { area: 'career', text: 'Tek bir önceliğe odaklan; dağınık çaba yerine istikrarlı adımlar ilerleme getirir.' },
          { area: 'money', text: 'Bütçeni gözden geçir; acele harcamalardan çok değer odaklı seçimler yap.' },
          { area: 'energy', text: 'Dinlenme ile hareketi dengele; bedenini dinle ve temponu zorlamadan koru.' },
        ]
      : [
          { area: 'love', text: 'Make room for open communication; small gestures go a long way this period.' },
          { area: 'career', text: 'Focus on one priority; steady steps beat scattered effort for real progress.' },
          { area: 'money', text: 'Review your budget; favour value-led choices over impulse spending.' },
          { area: 'energy', text: 'Balance rest with movement; listen to your body and keep a sustainable pace.' },
        ];
  return {
    period,
    start,
    overview:
      locale === 'tr'
        ? `Bu ${p} genel olarak dengeli bir enerji taşıyor. Küçük ve kararlı adımlarla ilerle; fırsatlar sabırlı olanı ödüllendirir.`
        : `This ${p} carries a broadly balanced energy. Move in small, deliberate steps; the openings reward patience.`,
    themes,
    keyDates: [],
  };
}
