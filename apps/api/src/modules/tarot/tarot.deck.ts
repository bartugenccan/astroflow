import { Locale } from '../astrology/interpretation.types';

/**
 * The 78-card Rider–Waite–Smith deck. Card ids are the contract with the mobile
 * app (which maps them to the bundled card images): `major_00`…`major_21`,
 * `<suit>_01`…`<suit>_14` (01 = Ace, 11 = Page, 12 = Knight, 13 = Queen, 14 = King).
 *
 * Keywords ground the AI prompt in the traditional meanings and feed the
 * no-API-key stubs. `astro` is the Golden Dawn correspondence — taken from
 * here, never from the model, so it cannot be hallucinated.
 */

export type TarotSuit = 'wands' | 'cups' | 'swords' | 'pentacles';
export type TarotElement = 'fire' | 'water' | 'air' | 'earth';

type Bi = { en: string; tr: string };
type BiList = { en: string[]; tr: string[] };

export interface TarotCard {
  id: string;
  arcana: 'major' | 'minor';
  suit?: TarotSuit;
  rank: number; // major: 0–21, minor: 1–14
  name: Bi;
  upright: BiList;
  reversed: BiList;
  astro: Bi;
  element: TarotElement;
}

const PLANET_TR: Record<string, string> = {
  Sun: 'Güneş', Moon: 'Ay', Mercury: 'Merkür', Venus: 'Venüs', Mars: 'Mars',
  Jupiter: 'Jüpiter', Saturn: 'Satürn', Uranus: 'Uranüs', Neptune: 'Neptün', Pluto: 'Plüton',
};
const SIGN_TR: Record<string, string> = {
  Aries: 'Koç', Taurus: 'Boğa', Gemini: 'İkizler', Cancer: 'Yengeç', Leo: 'Aslan', Virgo: 'Başak',
  Libra: 'Terazi', Scorpio: 'Akrep', Sagittarius: 'Yay', Capricorn: 'Oğlak', Aquarius: 'Kova', Pisces: 'Balık',
};
const ELEMENT_NAME: Record<TarotElement, Bi> = {
  fire: { en: 'Fire', tr: 'Ateş' },
  water: { en: 'Water', tr: 'Su' },
  air: { en: 'Air', tr: 'Hava' },
  earth: { en: 'Earth', tr: 'Toprak' },
};

const split = (s: string) => s.split(',').map((w) => w.trim());
const kw = (en: string, tr: string): BiList => ({ en: split(en), tr: split(tr) });

/** ('Mars', 'Aries') → { en: 'Mars in Aries', tr: 'Koç burcunda Mars' } */
function planetInSign(planet: string, sign: string): Bi {
  return { en: `${planet} in ${sign}`, tr: `${SIGN_TR[sign]} burcunda ${PLANET_TR[planet]}` };
}

// ── Major Arcana ──────────────────────────────────────────────────────────────
// [name en, name tr, astro en, astro tr, element, upright en, upright tr, reversed en, reversed tr]
type MajorRow = [string, string, string, string, TarotElement, string, string, string, string];

const MAJORS: MajorRow[] = [
  ['The Fool', 'Deli', 'Air · Uranus', 'Hava · Uranüs', 'air',
    'new beginnings, spontaneity, a leap of faith', 'yeni başlangıç, kendiliğindenlik, inanç sıçraması',
    'recklessness, hesitation, naivety', 'pervasızlık, tereddüt, saflık'],
  ['The Magician', 'Büyücü', 'Mercury', 'Merkür', 'air',
    'willpower, skill, manifestation', 'irade, beceri, gerçekleştirme',
    'manipulation, scattered energy, untapped talent', 'manipülasyon, dağınık enerji, kullanılmayan yetenek'],
  ['The High Priestess', 'Başrahibe', 'Moon', 'Ay', 'water',
    'intuition, the unconscious, inner knowing', 'sezgi, bilinçaltı, içsel bilgi',
    'secrets, disconnected intuition, withdrawal', 'sırlar, sezgiden kopukluk, içe kapanma'],
  ['The Empress', 'İmparatoriçe', 'Venus', 'Venüs', 'earth',
    'abundance, nurturing, creativity', 'bolluk, besleyicilik, yaratıcılık',
    'dependence, creative block, neglecting yourself', 'bağımlılık, yaratıcı tıkanma, kendini ihmal'],
  ['The Emperor', 'İmparator', 'Aries', 'Koç', 'fire',
    'structure, authority, stability', 'düzen, otorite, istikrar',
    'rigidity, control, domination', 'katılık, kontrolcülük, baskı'],
  ['The Hierophant', 'Başrahip', 'Taurus', 'Boğa', 'earth',
    'tradition, guidance, shared values', 'gelenek, rehberlik, ortak değerler',
    'rebellion, dogma, breaking convention', 'başkaldırı, dogma, kalıpları kırmak'],
  ['The Lovers', 'Aşıklar', 'Gemini', 'İkizler', 'air',
    'love, union, meaningful choice', 'aşk, birlik, anlamlı seçim',
    'disharmony, misaligned values, avoiding a choice', 'uyumsuzluk, değer çatışması, seçimden kaçma'],
  ['The Chariot', 'Savaş Arabası', 'Cancer', 'Yengeç', 'water',
    'determination, victory, momentum', 'kararlılık, zafer, ivme',
    'lack of direction, scattered will, obstacles', 'yön kaybı, dağılan irade, engeller'],
  ['Strength', 'Güç', 'Leo', 'Aslan', 'fire',
    'courage, compassion, inner strength', 'cesaret, şefkat, içsel güç',
    'self-doubt, low energy, raw emotion', 'özgüven eksikliği, düşük enerji, kontrolsüz duygu'],
  ['The Hermit', 'Ermiş', 'Virgo', 'Başak', 'earth',
    'introspection, solitude, inner guidance', 'içe bakış, yalnızlık, içsel rehberlik',
    'isolation, loneliness, withdrawal', 'yalıtılmışlık, yalnız kalma, geri çekilme'],
  ['Wheel of Fortune', 'Kader Çarkı', 'Jupiter', 'Jüpiter', 'fire',
    'cycles, destiny, turning point', 'döngüler, kader, dönüm noktası',
    'resistance to change, bad timing, repeating patterns', 'değişime direnç, kötü zamanlama, tekrarlayan kalıplar'],
  ['Justice', 'Adalet', 'Libra', 'Terazi', 'air',
    'fairness, truth, cause and effect', 'adalet, hakikat, sebep-sonuç',
    'imbalance, dishonesty, avoiding accountability', 'dengesizlik, dürüst olmamak, sorumluluktan kaçmak'],
  ['The Hanged Man', 'Asılan Adam', 'Water · Neptune', 'Su · Neptün', 'water',
    'surrender, pause, a new perspective', 'teslimiyet, duraklama, yeni bakış açısı',
    'stalling, resistance, needless sacrifice', 'oyalanma, direnç, gereksiz fedakârlık'],
  ['Death', 'Ölüm', 'Scorpio', 'Akrep', 'water',
    'endings, transformation, transition', 'bitişler, dönüşüm, geçiş',
    'resisting change, stagnation, fear of letting go', 'değişime direnmek, durgunluk, bırakma korkusu'],
  ['Temperance', 'Denge', 'Sagittarius', 'Yay', 'fire',
    'balance, moderation, patience', 'denge, ölçülülük, sabır',
    'excess, imbalance, impatience', 'aşırılık, dengesizlik, sabırsızlık'],
  ['The Devil', 'Şeytan', 'Capricorn', 'Oğlak', 'earth',
    'attachment, temptation, the shadow self', 'bağımlılık, cazibe, gölge benlik',
    'release, breaking free, reclaiming power', 'serbest kalma, zincirleri kırma, gücünü geri almak'],
  ['The Tower', 'Kule', 'Mars', 'Mars', 'fire',
    'sudden change, revelation, upheaval', 'ani değişim, aydınlanma, sarsıntı',
    'averted crisis, fear of change, delayed collapse', 'atlatılan kriz, değişim korkusu, ertelenen yıkım'],
  ['The Star', 'Yıldız', 'Aquarius', 'Kova', 'air',
    'hope, healing, renewal', 'umut, şifa, yenilenme',
    'discouragement, lost faith, disconnection', 'cesaretsizlik, inanç kaybı, kopukluk'],
  ['The Moon', 'Ay', 'Pisces', 'Balık', 'water',
    'illusion, intuition, the unknown', 'yanılsama, sezgi, bilinmeyen',
    'clarity emerging, fear released, fog lifting', 'netleşme, korkunun çözülmesi, sisin dağılması'],
  ['The Sun', 'Güneş', 'Sun', 'Güneş', 'fire',
    'joy, success, vitality', 'neşe, başarı, canlılık',
    'temporary gloom, dimmed confidence, delays', 'geçici karamsarlık, sönen özgüven, gecikmeler'],
  ['Judgement', 'Yargı', 'Fire · Pluto', 'Ateş · Plüton', 'fire',
    'awakening, reckoning, an inner calling', 'uyanış, hesaplaşma, içsel çağrı',
    'self-doubt, ignoring the call, harsh self-judgment', 'kendinden şüphe, çağrıyı duymazdan gelmek, sert öz eleştiri'],
  ['The World', 'Dünya', 'Saturn', 'Satürn', 'earth',
    'completion, integration, fulfillment', 'tamamlanma, bütünleşme, doyum',
    'unfinished business, lack of closure, delays', 'yarım işler, kapanmamış döngü, gecikme'],
];

// ── Minor Arcana ──────────────────────────────────────────────────────────────

const SUITS: Record<TarotSuit, { en: string; tr: string; element: TarotElement; signs: string }> = {
  wands: { en: 'Wands', tr: 'Asaların', element: 'fire', signs: 'Aries · Leo · Sagittarius' },
  cups: { en: 'Cups', tr: 'Kupaların', element: 'water', signs: 'Cancer · Scorpio · Pisces' },
  swords: { en: 'Swords', tr: 'Kılıçların', element: 'air', signs: 'Libra · Aquarius · Gemini' },
  pentacles: { en: 'Pentacles', tr: 'Tılsımların', element: 'earth', signs: 'Capricorn · Taurus · Virgo' },
};

const RANK_EN = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
const RANK_TR = ['Ası', 'İkilisi', 'Üçlüsü', 'Dörtlüsü', 'Beşlisi', 'Altılısı', 'Yedilisi', 'Sekizlisi', 'Dokuzlusu', 'Onlusu', 'Uşağı', 'Şövalyesi', 'Kraliçesi', 'Kralı'];

/** Golden Dawn decans for the pips 2–10, per suit (planet, sign). */
const DECANS: Record<TarotSuit, [string, string][]> = {
  wands: [['Mars', 'Aries'], ['Sun', 'Aries'], ['Venus', 'Aries'], ['Saturn', 'Leo'], ['Jupiter', 'Leo'], ['Mars', 'Leo'], ['Mercury', 'Sagittarius'], ['Moon', 'Sagittarius'], ['Saturn', 'Sagittarius']],
  cups: [['Venus', 'Cancer'], ['Mercury', 'Cancer'], ['Moon', 'Cancer'], ['Mars', 'Scorpio'], ['Sun', 'Scorpio'], ['Venus', 'Scorpio'], ['Saturn', 'Pisces'], ['Jupiter', 'Pisces'], ['Mars', 'Pisces']],
  swords: [['Moon', 'Libra'], ['Saturn', 'Libra'], ['Jupiter', 'Libra'], ['Venus', 'Aquarius'], ['Mercury', 'Aquarius'], ['Moon', 'Aquarius'], ['Jupiter', 'Gemini'], ['Mars', 'Gemini'], ['Sun', 'Gemini']],
  pentacles: [['Jupiter', 'Capricorn'], ['Mars', 'Capricorn'], ['Sun', 'Capricorn'], ['Mercury', 'Taurus'], ['Moon', 'Taurus'], ['Saturn', 'Taurus'], ['Sun', 'Virgo'], ['Venus', 'Virgo'], ['Mercury', 'Virgo']],
};

/** Court cards carry a sub-element of their suit (Page = Earth, Knight = Air, Queen = Water, King = Fire). */
const COURT_ELEMENT: TarotElement[] = ['earth', 'air', 'water', 'fire'];

// Per suit, ranks 1–14: [upright en, upright tr, reversed en, reversed tr]
type MinorRow = [string, string, string, string];

const MINORS: Record<TarotSuit, MinorRow[]> = {
  wands: [
    ['inspiration, new venture, creative spark', 'ilham, yeni girişim, yaratıcı kıvılcım', 'delays, lack of motivation, false start', 'gecikme, motivasyon eksikliği, yanlış başlangıç'],
    ['planning, future vision, bold decisions', 'planlama, gelecek vizyonu, cesur kararlar', 'fear of the unknown, poor planning, playing it safe', 'bilinmeyen korkusu, zayıf plan, fazla temkin'],
    ['expansion, foresight, progress', 'genişleme, öngörü, ilerleme', 'obstacles, delays, frustration', 'engeller, gecikmeler, hayal kırıklığı'],
    ['celebration, homecoming, harmony', 'kutlama, eve dönüş, uyum', 'instability at home, transition, lack of support', 'evde huzursuzluk, geçiş dönemi, destek eksikliği'],
    ['competition, conflict, friction', 'rekabet, çatışma, sürtüşme', 'avoiding conflict, inner tension, truce', 'çatışmadan kaçma, iç gerginlik, ateşkes'],
    ['victory, recognition, confidence', 'zafer, takdir, özgüven', 'ego, fall from grace, lack of recognition', 'ego, itibar kaybı, görülmemek'],
    ['standing your ground, perseverance, defense', 'yerini korumak, direniş, savunma', 'overwhelm, giving up, exhaustion', 'bunalmışlık, pes etme, tükenmişlik'],
    ['swift action, movement, news', 'hızlı hareket, ivme, haberler', 'delays, frustration, waiting', 'gecikmeler, sabırsızlık, bekleyiş'],
    ['resilience, persistence, the last stretch', 'dayanıklılık, azim, son düzlük', 'paranoia, fatigue, defensiveness', 'kuşkuculuk, yorgunluk, savunmacılık'],
    ['burden, responsibility, hard work', 'yük, sorumluluk, çok çalışma', 'delegating, releasing burdens, burnout', 'yük paylaşmak, bırakmak, tükenmişlik'],
    ['curiosity, enthusiasm, exploration', 'merak, heves, keşif', 'impatience, scattered ideas, hesitation', 'sabırsızlık, dağınık fikirler, tereddüt'],
    ['passion, adventure, bold action', 'tutku, macera, cesur hamle', 'haste, recklessness, frustration', 'acelecilik, pervasızlık, öfke'],
    ['confidence, warmth, determination', 'özgüven, sıcaklık, kararlılık', 'jealousy, insecurity, burnout', 'kıskançlık, güvensizlik, tükenme'],
    ['vision, leadership, boldness', 'vizyon, liderlik, cesaret', 'impulsiveness, arrogance, high expectations', 'dürtüsellik, kibir, aşırı beklenti'],
  ],
  cups: [
    ['new love, emotional opening, compassion', 'yeni aşk, duygusal açılım, şefkat', 'blocked emotions, emptiness, self-love needed', 'bastırılmış duygular, boşluk, öz sevgi ihtiyacı'],
    ['partnership, mutual attraction, connection', 'ortaklık, karşılıklı çekim, bağ', 'imbalance, broken communication, tension', 'dengesizlik, kopan iletişim, gerginlik'],
    ['friendship, celebration, community', 'dostluk, kutlama, topluluk', 'overindulgence, gossip, isolation', 'aşırılık, dedikodu, yalnız kalma'],
    ['contemplation, apathy, reevaluation', 'tefekkür, ilgisizlik, yeniden değerlendirme', 'new awareness, acceptance, motivation returns', 'yeni farkındalık, kabul, motivasyonun dönüşü'],
    ['loss, grief, regret', 'kayıp, yas, pişmanlık', 'acceptance, moving on, forgiveness', 'kabul, yola devam, affetme'],
    ['nostalgia, innocence, childhood memories', 'nostalji, masumiyet, çocukluk anıları', 'stuck in the past, idealised memories, moving forward', 'geçmişe takılmak, idealize anılar, ileri bakmak'],
    ['choices, fantasy, illusion', 'seçenekler, hayal, yanılsama', 'clarity, a decisive choice, reality check', 'netlik, kararlı seçim, gerçekle yüzleşme'],
    ['walking away, disillusion, seeking deeper meaning', 'uzaklaşmak, hayal kırıklığı, daha derin anlam arayışı', 'fear of leaving, aimless drifting, trying one more time', 'gitme korkusu, amaçsızlık, bir kez daha denemek'],
    ['contentment, wishes fulfilled, satisfaction', 'memnuniyet, gerçekleşen dilek, tatmin', 'smugness, dissatisfaction, materialism', 'kendini beğenmişlik, tatminsizlik, maddecilik'],
    ['harmony, family, emotional fulfillment', 'uyum, aile, duygusal doyum', 'broken harmony, misaligned values, family tension', 'bozulan uyum, uyuşmayan değerler, aile içi gerginlik'],
    ['creative opportunity, intuitive message, curiosity', 'yaratıcı fırsat, sezgisel mesaj, merak', 'emotional immaturity, creative block, insecurity', 'duygusal olgunlaşmamışlık, yaratıcı tıkanma, güvensizlik'],
    ['romance, charm, following the heart', 'romantizm, çekicilik, kalbin sesini izlemek', 'moodiness, unrealistic ideals, jealousy', 'duygu dalgalanması, gerçek dışı idealler, kıskançlık'],
    ['compassion, emotional security, intuition', 'şefkat, duygusal güven, sezgi', 'codependency, emotional overwhelm, martyrdom', 'karşılıklı bağımlılık, duygusal taşkınlık, kendini feda etme'],
    ['emotional balance, diplomacy, generosity', 'duygusal denge, diplomasi, cömertlik', 'manipulation, moodiness, emotional coldness', 'manipülasyon, huysuzluk, duygusal soğukluk'],
  ],
  swords: [
    ['clarity, breakthrough, truth', 'netlik, atılım, hakikat', 'confusion, miscommunication, clouded judgment', 'kafa karışıklığı, yanlış iletişim, bulanık yargı'],
    ['a difficult choice, stalemate, avoidance', 'zor seçim, çıkmaz, kaçınma', 'information overload, indecision, confusion', 'bilgi yükü, kararsızlık, karmaşa'],
    ['heartbreak, grief, a painful truth', 'kalp kırıklığı, keder, acı gerçek', 'healing, forgiveness, releasing pain', 'iyileşme, affetme, acıyı bırakmak'],
    ['rest, recovery, contemplation', 'dinlenme, toparlanma, tefekkür', 'restlessness, burnout, a forced pause', 'huzursuzluk, tükenmişlik, zorunlu mola'],
    ['conflict, hollow victory, tension', 'çatışma, boş zafer, gerginlik', 'reconciliation, making amends, moving past conflict', 'barışma, telafi, çatışmayı geride bırakmak'],
    ['transition, moving on, calmer waters', 'geçiş, yola devam, sakin sular', 'resistance to change, unfinished business, turbulence', 'değişime direnç, yarım işler, çalkantı'],
    ['strategy, secrecy, cunning', 'strateji, gizlilik, kurnazlık', 'confession, conscience, getting caught', 'itiraf, vicdan, ortaya çıkmak'],
    ['feeling trapped, self-limiting beliefs, restriction', 'kapana kısılmışlık, sınırlayıcı inançlar, kısıtlama', 'self-acceptance, a new perspective, release', 'kendini kabul, yeni bakış, özgürleşme'],
    ['anxiety, worry, sleepless nights', 'kaygı, endişe, uykusuz geceler', 'hope, reaching out, fears loosening', 'umut, yardım istemek, gevşeyen korkular'],
    ['a painful ending, rock bottom, release', 'acı bir son, dip nokta, bırakış', 'recovery, regeneration, resisting an inevitable end', 'toparlanma, yeniden doğuş, kaçınılmaz sona direnmek'],
    ['curiosity, new ideas, vigilance', 'merak, yeni fikirler, tetikte olmak', 'gossip, scattered thoughts, all talk', 'dedikodu, dağınık düşünceler, laf kalabalığı'],
    ['ambition, fast thinking, drive', 'hırs, hızlı düşünce, itici güç', 'impulsiveness, burnout, no direction', 'dürtüsellik, tükenme, yönsüzlük'],
    ['clear boundaries, independence, honest perception', 'net sınırlar, bağımsızlık, dürüst algı', 'coldness, bitterness, being overly critical', 'soğukluk, kırgınlık, aşırı eleştirellik'],
    ['intellect, truth, authority', 'akıl, hakikat, otorite', 'manipulation, cruelty, abuse of power', 'manipülasyon, acımasızlık, gücün kötüye kullanımı'],
  ],
  pentacles: [
    ['new opportunity, prosperity, manifestation', 'yeni fırsat, refah, somutlaşma', 'missed opportunity, poor planning, scarcity', 'kaçan fırsat, zayıf planlama, kıtlık hissi'],
    ['balance, adaptability, juggling priorities', 'denge, uyum sağlama, öncelikleri idare', 'overcommitment, disorganisation, imbalance', 'aşırı yüklenme, dağınıklık, dengesizlik'],
    ['teamwork, craftsmanship, learning', 'ekip çalışması, ustalık, öğrenme', 'disharmony, poor quality, lack of teamwork', 'uyumsuzluk, özensizlik, iş birliği eksikliği'],
    ['security, saving, control', 'güvence, biriktirme, kontrol', 'greed, over-control, letting go', 'açgözlülük, aşırı kontrol, gevşemek'],
    ['hardship, insecurity, feeling left out', 'zorluk, güvensizlik, dışlanmışlık', 'recovery, spiritual comfort, help arriving', 'toparlanma, manevi teselli, gelen yardım'],
    ['generosity, giving and receiving, fairness', 'cömertlik, alıp vermek, hakkaniyet', 'strings attached, debt, one-sided charity', 'karşılık beklemek, borç, tek taraflı yardım'],
    ['patience, a long-term view, investment', 'sabır, uzun vade, yatırım', 'impatience, limited returns, wasted effort', 'sabırsızlık, sınırlı getiri, boşa emek'],
    ['diligence, mastery, skill-building', 'özen, ustalaşma, beceri geliştirme', 'perfectionism, lack of focus, mediocrity', 'mükemmeliyetçilik, odak kaybı, vasatlık'],
    ['independence, self-sufficiency, comfort', 'bağımsızlık, kendine yetme, konfor', 'overworking, financial setback, hollow comfort', 'aşırı çalışma, maddi aksilik, içi boş konfor'],
    ['legacy, wealth, family stability', 'miras, zenginlik, aile istikrarı', 'financial loss, family disputes, instability', 'maddi kayıp, aile anlaşmazlığı, istikrarsızlık'],
    ['ambition, diligence, new study', 'hırs, çalışkanlık, yeni öğrenim', 'procrastination, lack of progress, unrealistic goals', 'erteleme, ilerleyememe, gerçekçi olmayan hedefler'],
    ['reliability, routine, steady progress', 'güvenilirlik, rutin, istikrarlı ilerleme', 'stagnation, boredom, laziness', 'durgunluk, sıkılma, tembellik'],
    ['nurturing, practicality, abundance', 'besleyicilik, pratiklik, bolluk', 'self-neglect, work-home imbalance, smothering', 'kendini ihmal, iş-ev dengesizliği, boğucu ilgi'],
    ['wealth, discipline, security', 'varlık, disiplin, güvence', 'greed, stubbornness, obsession with status', 'açgözlülük, inatçılık, statü takıntısı'],
  ],
};

function minorAstro(suit: TarotSuit, rank: number): Bi {
  const s = SUITS[suit];
  const el = ELEMENT_NAME[s.element];
  if (rank === 1) return { en: `Root of ${el.en}`, tr: `${el.tr} elementinin kökü` };
  if (rank <= 10) {
    const [planet, sign] = DECANS[suit][rank - 2];
    return planetInSign(planet, sign);
  }
  const sub = ELEMENT_NAME[COURT_ELEMENT[rank - 11]];
  return { en: `${sub.en} of ${el.en}`, tr: `${el.tr} içinde ${sub.tr}` };
}

function buildDeck(): TarotCard[] {
  const deck: TarotCard[] = MAJORS.map(([nameEn, nameTr, astroEn, astroTr, element, upEn, upTr, revEn, revTr], i) => ({
    id: `major_${String(i).padStart(2, '0')}`,
    arcana: 'major',
    rank: i,
    name: { en: nameEn, tr: nameTr },
    upright: kw(upEn, upTr),
    reversed: kw(revEn, revTr),
    astro: { en: astroEn, tr: astroTr },
    element,
  }));
  for (const suit of Object.keys(SUITS) as TarotSuit[]) {
    const s = SUITS[suit];
    MINORS[suit].forEach(([upEn, upTr, revEn, revTr], idx) => {
      const rank = idx + 1;
      deck.push({
        id: `${suit}_${String(rank).padStart(2, '0')}`,
        arcana: 'minor',
        suit,
        rank,
        name: { en: `${RANK_EN[idx]} of ${s.en}`, tr: `${s.tr} ${RANK_TR[idx]}` },
        upright: kw(upEn, upTr),
        reversed: kw(revEn, revTr),
        astro: minorAstro(suit, rank),
        element: s.element,
      });
    });
  }
  return deck;
}

export const TAROT_DECK: TarotCard[] = buildDeck();
export const TAROT_CARD_IDS: string[] = TAROT_DECK.map((c) => c.id);
const BY_ID = new Map(TAROT_DECK.map((c) => [c.id, c]));

export function tarotCard(id: string): TarotCard {
  const card = BY_ID.get(id);
  if (!card) throw new Error(`Unknown tarot card: ${id}`);
  return card;
}

export function suitSigns(suit: TarotSuit): string {
  return SUITS[suit].signs;
}

/** Zodiac sign in the reader's language (chart data is always English). */
export function signName(sign: string, locale: Locale): string {
  return locale === 'tr' ? (SIGN_TR[sign] ?? sign) : sign;
}

export function elementName(element: TarotElement, locale: Locale): string {
  return ELEMENT_NAME[element][locale];
}
