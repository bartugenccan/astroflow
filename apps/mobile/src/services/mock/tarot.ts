import { TarotCardReading, TarotSpread, TarotSynthesis } from "../types";
import { Locale, TranslationKey, translate } from "../../i18n";
import { tarotCardInfo } from "../../features/tarot/deck";

/** Offline stand-ins for the tarot AI — shaped like the real readings. */

const cardName = (id: string, locale: Locale) => tarotCardInfo(id)?.name[locale] ?? id;

const positionName = (spread: TarotSpread, index: number, locale: Locale) =>
  translate(locale, `tarot.positions.${spread.category}.p${index}` as TranslationKey);

export function mockTarotCard(spread: TarotSpread, index: number, locale: Locale): TarotCardReading {
  const drawn = spread.cards[index];
  const name = cardName(drawn.cardId, locale);
  const position = positionName(spread, index, locale);
  const tr = locale === "tr";
  return {
    cardId: drawn.cardId,
    position: index,
    positionName: position,
    reversed: drawn.reversed,
    headline: tr ? `${name} sana yavaşlamanı fısıldıyor.` : `${name} whispers: slow down and look closer.`,
    keywords: tr ? ["farkındalık", "denge", "cesaret", "zamanlama"] : ["awareness", "balance", "courage", "timing"],
    essence: tr
      ? `${name}${drawn.reversed ? " ters geldiğinde" : ""} kartın görselindeki figürler, renkler ve semboller aynı temayı anlatır: iç sesine kulak verip bir sonraki adımı bilinçle atmak. (Çevrimdışı örnek metin — gerçek yorum sunucudan gelir.)`
      : `${name}${drawn.reversed ? ", reversed," : ""} gathers its figures, colours and symbols around one theme: listening inward and taking the next step consciously. (Offline sample text — the real reading comes from the server.)`,
    inPosition: tr
      ? `"${position}" pozisyonunda bu kart, konunun bu yönünü aydınlatıyor ve sana nereye bakman gerektiğini gösteriyor.`
      : `In the "${position}" position this card lights up this side of the matter and shows you where to look.`,
    forYou: tr
      ? "Bu günlerde senin için en önemli şey, acele etmeden ama ertelemeden küçük ve net bir adım atmak."
      : "What matters most for you now is one small, clear step — unhurried, but not postponed.",
    shadow: tr
      ? "Her şeyi bir anda çözmeye çalışmak seni yorabilir; bir seferde tek bir şeye odaklan."
      : "Trying to solve everything at once can wear you out; focus on one thing at a time.",
    advice: tr
      ? "Bu hafta aklındaki soruyla ilgili tek bir somut adım seç ve uygula; akşam neyin değiştiğini birkaç cümleyle yaz."
      : "This week, pick one concrete step connected to your question and take it; in the evening, write a few lines on what shifted.",
    astro: "—",
  };
}

export function mockTarotSynthesis(spread: TarotSpread, locale: Locale): TarotSynthesis {
  const names = spread.cards.map((c) => cardName(c.cardId, locale)).join(", ");
  const tr = locale === "tr";
  return {
    title: tr ? "Sessiz bir dönüşüm" : "A quiet turning",
    story: tr
      ? `${names} birlikte, yavaş ama derin bir değişimi anlatıyor. İlk kart zemini hazırlıyor, ikincisi şu anki sınavı gösteriyor, üçüncüsü de bu sınavdan geçtiğinde açılan kapıyı. (Çevrimdışı örnek metin.)`
      : `${names} together tell of a slow but deep change. The first card lays the ground, the second shows the present test, and the third the door that opens once you pass it. (Offline sample text.)`,
    guidance: tr
      ? ["Bir şeyi değiştirmeden önce dinle.", "Tek bir önceliğe odaklan.", "Küçük ilerlemeleri kutla."]
      : ["Listen before you change anything.", "Focus on a single priority.", "Celebrate small progress."],
    affirmation: tr ? "Yolumu sabırla ve güvenle yürüyorum." : "I walk my path with patience and trust.",
  };
}
