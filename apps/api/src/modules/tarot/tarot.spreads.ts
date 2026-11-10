import { Locale } from '../astrology/interpretation.types';
import { TarotCategory, TarotSpread } from './tarot.types';

interface Position {
  name: Record<Locale, string>;
  /** What this slot asks of the card — steers the "in this position" section. */
  asks: Record<Locale, string>;
}

/** Three-card spreads, one per category. Position labels are mirrored in the mobile i18n. */
export const TAROT_SPREADS: Record<TarotCategory, Position[]> = {
  general: [
    { name: { en: 'Past', tr: 'Geçmiş' }, asks: { en: 'the roots of the situation — what has shaped it', tr: 'durumun kökleri — onu neyin şekillendirdiği' } },
    { name: { en: 'Present', tr: 'Şimdi' }, asks: { en: 'the energy at work right now', tr: 'şu anda iş başında olan enerji' } },
    { name: { en: 'Future', tr: 'Gelecek' }, asks: { en: 'where things are heading if nothing changes', tr: 'hiçbir şey değişmezse işlerin gittiği yön' } },
  ],
  love: [
    { name: { en: 'You', tr: 'Sen' }, asks: { en: 'how the querent shows up in love right now', tr: 'danışanın şu an aşkta nasıl bir yerde durduğu' } },
    { name: { en: 'The other', tr: 'Karşındaki' }, asks: { en: 'the partner, the person in mind, or what love is bringing', tr: 'partner, akıldaki kişi ya da aşkın getirdiği şey' } },
    { name: { en: 'Where it’s going', tr: 'İlişkinin yönü' }, asks: { en: 'the direction of the bond and its potential', tr: 'bağın gittiği yön ve potansiyeli' } },
  ],
  career: [
    { name: { en: 'Where you stand', tr: 'Mevcut durum' }, asks: { en: 'the current state of work and ambitions', tr: 'işin ve hedeflerin şu anki durumu' } },
    { name: { en: 'The obstacle', tr: 'Engel' }, asks: { en: 'what blocks or tests progress', tr: 'ilerlemeyi engelleyen ya da sınayan şey' } },
    { name: { en: 'Likely outcome', tr: 'Olası sonuç' }, asks: { en: 'the most likely outcome and how to steer it', tr: 'en olası sonuç ve ona nasıl yön verileceği' } },
  ],
  money: [
    { name: { en: 'Where you stand', tr: 'Şu anki durum' }, asks: { en: 'the current financial picture and mindset', tr: 'şu anki maddi tablo ve bakış açısı' } },
    { name: { en: 'Watch out for', tr: 'Dikkat et' }, asks: { en: 'the leak, risk or habit to watch', tr: 'dikkat edilmesi gereken kaçak, risk ya da alışkanlık' } },
    { name: { en: 'The opportunity', tr: 'Fırsat' }, asks: { en: 'the opening worth moving toward', tr: 'yönelmeye değer açılım' } },
  ],
  health: [
    { name: { en: 'Your energy', tr: 'Enerjin' }, asks: { en: 'the querent’s overall energy and vitality now', tr: 'danışanın şu anki genel enerjisi ve canlılığı' } },
    { name: { en: 'What drains you', tr: 'Seni yoran' }, asks: { en: 'what depletes energy — habits, stress, patterns', tr: 'enerjiyi tüketen şey — alışkanlıklar, stres, kalıplar' } },
    { name: { en: 'What restores you', tr: 'Seni besleyen' }, asks: { en: 'what replenishes and supports well-being', tr: 'yenileyen ve iyi oluşu destekleyen şey' } },
  ],
  spiritual: [
    { name: { en: 'Today’s lesson', tr: 'Bugünkü dersin' }, asks: { en: 'the lesson the soul is working on', tr: 'ruhun üzerinde çalıştığı ders' } },
    { name: { en: 'Let go of', tr: 'Bırakman gereken' }, asks: { en: 'what is ready to be released', tr: 'bırakılmaya hazır olan şey' } },
    { name: { en: 'What awaits', tr: 'Seni bekleyen' }, asks: { en: 'the gift or growth waiting ahead', tr: 'ileride bekleyen armağan ya da gelişim' } },
  ],
};

/**
 * "Yol ayrımı" — a five-card decision spread (opens at Aster's Glimmer stage).
 * The same positions for every category; the category steers the reading.
 */
export const DECISION_SPREAD: Position[] = [
  { name: { en: 'Where you stand', tr: 'Bulunduğun yer' }, asks: { en: 'the situation and the choice in front of the querent', tr: 'danışanın önündeki durum ve seçim' } },
  { name: { en: 'Path one', tr: 'Birinci yol' }, asks: { en: 'what the first option brings if it is chosen', tr: 'ilk seçenek seçilirse getireceği şey' } },
  { name: { en: 'Path two', tr: 'İkinci yol' }, asks: { en: 'what the second option brings if it is chosen', tr: 'ikinci seçenek seçilirse getireceği şey' } },
  { name: { en: 'What you overlook', tr: 'Gözden kaçan' }, asks: { en: 'the hidden factor or feeling the querent is not weighing', tr: 'danışanın hesaba katmadığı gizli etken ya da his' } },
  { name: { en: 'Guidance', tr: 'Rehberlik' }, asks: { en: 'the attitude that helps whichever path is taken', tr: 'hangi yol seçilirse seçilsin işe yarayacak tutum' } },
];

/** Card count per spread. */
export const SPREAD_SIZE: Record<TarotSpread, number> = { three: 3, decision: 5 };

/** The positions of a spread for a category. */
export function spreadPositions(category: TarotCategory, spread: TarotSpread = 'three'): Position[] {
  return spread === 'decision' ? DECISION_SPREAD : TAROT_SPREADS[category];
}

export const CATEGORY_LABEL: Record<TarotCategory, Record<Locale, string>> = {
  general: { en: 'general life', tr: 'genel yaşam' },
  love: { en: 'love and relationships', tr: 'aşk ve ilişkiler' },
  career: { en: 'career and work', tr: 'kariyer ve iş' },
  money: { en: 'money and abundance', tr: 'para ve bolluk' },
  health: { en: 'health and energy (well-being, not medical)', tr: 'sağlık ve enerji (iyi oluş, tıbbi değil)' },
  spiritual: { en: 'spiritual growth', tr: 'ruhsal gelişim' },
};
