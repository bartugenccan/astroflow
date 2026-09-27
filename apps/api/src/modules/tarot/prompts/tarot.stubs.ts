import { Locale } from '../../astrology/interpretation.types';
import { TarotCard, elementName } from '../tarot.deck';
import { CATEGORY_LABEL, TAROT_SPREADS } from '../tarot.spreads';
import { TarotCardReading, TarotCategory, TarotDrawnCard, TarotSynthesis } from '../tarot.types';

/**
 * Templated readings used when no AI key is configured or the model fails.
 * Built from the deck's traditional keywords so they still say something true
 * about the card, position and orientation.
 */

const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

export function tarotCardStub(
  locale: Locale,
  category: TarotCategory,
  card: TarotCard,
  drawn: TarotDrawnCard,
  index: number,
): Omit<TarotCardReading, 'cardId' | 'position' | 'reversed' | 'astro'> {
  const position = TAROT_SPREADS[category][index];
  const words = (drawn.reversed ? card.reversed : card.upright)[locale];
  const [a, b, c] = words;
  const topic = CATEGORY_LABEL[category][locale];
  const name = card.name[locale];
  const el = elementName(card.element, locale);

  if (locale === 'tr') {
    return {
      positionName: position.name.tr,
      headline: `${cap(a)} kapını çalıyor.`,
      keywords: words.slice(0, 4),
      essence: drawn.reversed
        ? `${name} ters geldiğinde, kartın taşıdığı enerji engellenmiş ya da içe dönmüş olarak okunur: ${words.join(', ')}. Bu bir uyarıdan çok bir davettir — bir şeyin akmadığını fark etmen ve nedenine bakman için. Kartın astrolojik karşılığı ${card.astro.tr}; ${el} elementinin bu tonu, neyin tıkandığını anlamana yardım eder.`
        : `${name}, ${words.join(', ')} temalarını taşır. Kartın görselindeki her sembol bu enerjinin farklı bir yüzünü anlatır ve seni bu temalarla bilinçli çalışmaya çağırır. Astrolojik karşılığı ${card.astro.tr}; ${el} elementinin niteliği kartın mesajına renk verir.`,
      inPosition: `"${position.name.tr}" pozisyonunda bu kart, ${position.asks.tr} hakkında konuşuyor. ${cap(a)} ve ${b} burada ana tema; ${topic} alanında bunun somut karşılığını bu günlerde fark edebilirsin.`,
      forYou: `${topic} konusunda bu kart sana ${a} ile ${c} arasındaki dengeyi hatırlatıyor. Kendi ritmine güven; kartın enerjisini zorlamadan, küçük ve tutarlı adımlarla hayatına taşı.`,
      shadow: drawn.reversed
        ? `Dikkat: ${words.join(', ')} seni olduğun yerde saydırabilir. Durumu olduğundan büyük görme; tek seferde her şeyi çözmeye çalışmak yerine bir adım at.`
        : `Gölge yanı: ${a} temasını aşırıya taşımak dengeyi bozabilir. Kendine ve karşındakine alan bırak.`,
      advice: `Bu hafta ${a} temasıyla ilgili küçük bir adım seç ve uygula. Günün sonunda neyin değiştiğini birkaç cümleyle yaz; ${b} konusunda kendine karşı nazik ol.`,
    };
  }
  return {
    positionName: position.name.en,
    headline: `${cap(a)} is knocking at your door.`,
    keywords: words.slice(0, 4),
    essence: drawn.reversed
      ? `Reversed, ${name} reads as blocked or internalised energy: ${words.join(', ')}. It is less a warning than an invitation — to notice where something isn't flowing and look at why. Its astrological correspondence is ${card.astro.en}; the ${el} tone helps you see what is stuck.`
      : `${name} carries the themes of ${words.join(', ')}. Every symbol on the card shows a different face of this energy and invites you to work with it consciously. Its astrological correspondence is ${card.astro.en}; the quality of ${el} colours its message.`,
    inPosition: `In the "${position.name.en}" position this card speaks about ${position.asks.en}. ${cap(a)} and ${b} are the core theme here; in ${topic} you may notice this concretely in the days ahead.`,
    forYou: `In ${topic}, this card reminds you of the balance between ${a} and ${c}. Trust your own rhythm; bring the card's energy into your life through small, consistent steps rather than force.`,
    shadow: drawn.reversed
      ? `Watch out: ${words.join(', ')} can keep you circling in place. Don't make the situation bigger than it is; take one step instead of trying to solve everything at once.`
      : `The shadow side: pushing ${a} too far can tip the balance. Leave room for yourself and for others.`,
    advice: `This week, choose one small step connected to ${a} and take it. At the end of the day, write a few lines on what shifted, and be gentle with yourself around ${b}.`,
  };
}

export function tarotSynthesisStub(
  locale: Locale,
  category: TarotCategory,
  cards: { card: TarotCard; drawn: TarotDrawnCard }[],
): TarotSynthesis {
  const names = cards.map((c) => c.card.name[locale]);
  const reversed = cards.filter((c) => c.drawn.reversed).length;
  const firstWords = cards.map((c) => (c.drawn.reversed ? c.card.reversed : c.card.upright)[locale][0]);
  const topic = CATEGORY_LABEL[category][locale];

  if (locale === 'tr') {
    return {
      title: `${cap(firstWords[0])} · ${firstWords[1]} · ${firstWords[2]}`,
      story: `${names.join(', ')} birlikte ${topic} alanında bir yolculuk anlatıyor: ${firstWords[0]} ile başlayan hikâye, ${firstWords[1]} üzerinden ${firstWords[2]} temasına uzanıyor. ${reversed ? `${reversed} ters kart, bu yolda bazı enerjilerin henüz tam akmadığını gösteriyor; acele etmek yerine neyin tıkandığına bakmak iyi gelecek.` : 'Tüm kartların düz gelmesi, enerjinin açık ve akışta olduğunu gösteriyor.'} Kartlar kesin bir kader değil, bir yön gösteriyor — seçim her zaman senin.`,
      guidance: [
        `${cap(firstWords[0])} temasıyla barış ve oradan güç al.`,
        `${cap(firstWords[1])} konusunda bu hafta bilinçli bir adım at.`,
        `${cap(firstWords[2])} için alan aç; sabırlı ol.`,
      ],
      affirmation: `Yolumu adım adım, güvenle yürüyorum.`,
    };
  }
  return {
    title: `From ${firstWords[0]} to ${firstWords[2]}`,
    story: `${names.join(', ')} together tell a journey in ${topic}: the story begins with ${firstWords[0]}, moves through ${firstWords[1]} and opens toward ${firstWords[2]}. ${reversed ? `${reversed} reversed card(s) show that some energy isn't fully flowing yet; rather than rushing, look at what is stuck.` : 'With every card upright, the energy is open and moving.'} The cards show a direction, not a fixed fate — the choice is always yours.`,
    guidance: [
      `Make peace with ${firstWords[0]} and draw strength from it.`,
      `Take one conscious step around ${firstWords[1]} this week.`,
      `Make room for ${firstWords[2]}; be patient.`,
    ],
    affirmation: 'I walk my path step by step, with trust.',
  };
}
