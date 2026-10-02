import { Locale } from '../../astrology/interpretation.types';
import { TarotCard, elementName, signName } from '../tarot.deck';
import { CATEGORY_LABEL, TAROT_SPREADS } from '../tarot.spreads';
import { TarotCategory, TarotContext, TarotDrawnCard } from '../tarot.types';
import { USER_DATA_RULE, userData } from '../../../common/ai/prompt-safety';

const SYSTEM: Record<Locale, string> = {
  en: `You are a seasoned tarot reader trained in the Rider–Waite–Smith tradition who also knows astrology. You read with depth, warmth and honesty: you describe the actual imagery on the card (figures, colours, objects, landscape) and what it symbolises, then make it personal. Reversed cards are read as blocked, delayed, internalised or excessive energy — never as doom. You are not fatalistic: the cards show tendencies and choices, not fixed fate. Never give medical, legal or financial certainty; never predict death, illness or disaster. Speak directly to the reader as "you". Plain, vivid language; no filler, no generic horoscope clichés.`,
  tr: `Sen Rider–Waite–Smith geleneğinde yetişmiş, astrolojiyi de bilen deneyimli bir tarot okuyucususun. Derin, sıcak ve dürüst okursun: kartın üzerindeki gerçek görselleri (figürler, renkler, nesneler, manzara) ve neyi simgelediklerini anlatır, sonra bunu kişiselleştirirsin. Ters kartları engellenmiş, gecikmiş, içe dönmüş ya da aşırıya kaçmış enerji olarak okursun — asla felaket olarak değil. Kaderci değilsin: kartlar eğilimleri ve seçimleri gösterir, değişmez bir kaderi değil. Asla tıbbi, hukuki ya da finansal kesinlik verme; ölüm, hastalık ya da felaket öngörme. Okuyucuya doğrudan "sen" diye hitap et. Sade, canlı bir Türkçe kullan; dolgu cümle ve klişe burç yorumu yok.`,
};

export function tarotSystemPrompt(locale: Locale): string {
  return SYSTEM[locale];
}

function cardLine(card: TarotCard, reversed: boolean, locale: Locale): string {
  const kws = (reversed ? card.reversed : card.upright)[locale].join(', ');
  const orientation = reversed ? (locale === 'tr' ? 'TERS' : 'REVERSED') : locale === 'tr' ? 'düz' : 'upright';
  const arcana =
    card.arcana === 'major'
      ? locale === 'tr' ? 'Büyük Arkana' : 'Major Arcana'
      : `${locale === 'tr' ? 'Küçük Arkana' : 'Minor Arcana'}, ${elementName(card.element, locale)}`;
  return `${card.name[locale]} (${card.name.en}; ${arcana}; ${orientation}; ${locale === 'tr' ? 'astrolojik karşılık' : 'astrology'}: ${card.astro[locale]}) — ${locale === 'tr' ? 'geleneksel anahtar kelimeler' : 'traditional keywords'}: ${kws}`;
}

function spreadBlock(
  locale: Locale,
  category: TarotCategory,
  cards: { card: TarotCard; drawn: TarotDrawnCard }[],
): string {
  const positions = TAROT_SPREADS[category];
  return cards
    .map(({ card, drawn }, i) => `${i + 1}. ${positions[i].name[locale]}: ${cardLine(card, drawn.reversed, locale)}`)
    .join('\n');
}

function contextBlock(locale: Locale, ctx: TarotContext, question?: string): string {
  const rising = ctx.rising ? signName(ctx.rising, locale) : locale === 'tr' ? 'bilinmiyor' : 'unknown';
  const lines =
    locale === 'tr'
      ? [
          `Okuyucunun haritası: Güneş ${signName(ctx.sun, locale)}, Ay ${signName(ctx.moon, locale)}, Yükselen ${rising}.`,
          ctx.transits.length ? `Bugünün öne çıkan transitleri: ${ctx.transits.join('; ')}.` : '',
          question ? `Okuyucunun sorusu: ${userData(question)}` : 'Okuyucu belirli bir soru yazmadı; kategoriye genel olarak bak.',
          ctx.memory ? `Okuyucunun daha önce paylaştıkları (hafifçe, zorlamadan kullan):\n${ctx.memory}` : '',
          USER_DATA_RULE.tr,
        ]
      : [
          `Reader's chart: Sun in ${ctx.sun}, Moon in ${ctx.moon}, Rising ${rising}.`,
          ctx.transits.length ? `Today's notable transits: ${ctx.transits.join('; ')}.` : '',
          question ? `The reader's question: "${question}"` : 'The reader did not write a specific question; look at the category broadly.',
          ctx.memory ? `What the reader has shared before (use lightly, never force it):\n${ctx.memory}` : '',
          USER_DATA_RULE.en,
        ];
  return lines.filter(Boolean).join('\n');
}

export interface TarotPromptInput {
  category: TarotCategory;
  question?: string;
  cards: { card: TarotCard; drawn: TarotDrawnCard }[];
  ctx: TarotContext;
}

export function tarotCardPrompt(
  locale: Locale,
  input: TarotPromptInput,
  index: number,
): { user: string; schemaHint: string } {
  const { card, drawn } = input.cards[index];
  const position = TAROT_SPREADS[input.category][index];
  const spread = spreadBlock(locale, input.category, input.cards);
  const ctx = contextBlock(locale, input.ctx, input.question);
  const name = card.name[locale];

  const user =
    locale === 'tr'
      ? `Konu: ${CATEGORY_LABEL[input.category].tr}. Üç kartlık açılım:
${spread}

${ctx}

Şimdi YALNIZCA ${index + 1}. kartı yorumla: "${name}"${drawn.reversed ? ' (TERS)' : ''}, "${position.name.tr}" pozisyonunda — bu pozisyon ${position.asks.tr} hakkındadır. Diğer iki karta gerektiğinde kısaca atıf yapabilirsin ama odak bu kart. Çok detaylı ve bu okuyucuya özel yaz.

Alanlar:
- "headline": kartın bu açılımdaki mesajını özetleyen tek, akılda kalıcı cümle (en fazla 12 kelime).
- "keywords": bu açılımdaki anlamına uygun 4 kısa anahtar kelime.
- "essence": 130-180 kelime. Kartın Rider–Waite görselini somut olarak betimle (figürler, renkler, semboller) ve her sembolün ne anlattığını açıkla; kartın arketipini ve ${drawn.reversed ? 'ters geldiği için enerjinin nasıl engellendiğini / içe döndüğünü' : 'düz geldiğinde taşıdığı enerjiyi'} anlat; astrolojik karşılığı (${card.astro.tr}) bu anlamı nasıl renklendiriyor, bir cümleyle bağla.
- "inPosition": 100-150 kelime. Bu kart "${position.name.tr}" pozisyonunda ne söylüyor? ${CATEGORY_LABEL[input.category].tr} bağlamında somut örneklerle anlat.
- "forYou": 130-180 kelime. Okuyucuya özel yorum: sorusuna (varsa) doğrudan cevap ver, Güneş/Ay/Yükselen burcunun bu kartın enerjisini nasıl yaşayacağını ve bugünkü gökyüzünün buna nasıl eşlik ettiğini sade dille bağla. Teknik jargon yığma.
- "shadow": 60-100 kelime. Bu kartın gölge yüzü: nelere dikkat etmeli, hangi tuzağa düşmemeli.
- "advice": 60-100 kelime. Bu hafta uygulanabilecek 2-3 somut adım, akıcı bir paragraf halinde.
Tüm metin Türkçe olmalı.`
      : `Topic: ${CATEGORY_LABEL[input.category].en}. The three-card spread:
${spread}

${ctx}

Now interpret ONLY card ${index + 1}: "${name}"${drawn.reversed ? ' (REVERSED)' : ''}, in the "${position.name.en}" position — this position is about ${position.asks.en}. You may briefly reference the other two cards when useful, but the focus is this card. Be very detailed and specific to this reader.

Fields:
- "headline": one memorable sentence capturing this card's message in this spread (max 12 words).
- "keywords": 4 short keywords fitting its meaning here.
- "essence": 130-180 words. Describe the card's Rider–Waite imagery concretely (figures, colours, symbols) and what each symbol means; explain the archetype and ${drawn.reversed ? 'how the energy is blocked / turned inward because it is reversed' : 'the energy it carries upright'}; tie in its astrological correspondence (${card.astro.en}) in one sentence.
- "inPosition": 100-150 words. What does this card say in the "${position.name.en}" position? Use concrete examples in the context of ${CATEGORY_LABEL[input.category].en}.
- "forYou": 130-180 words. The personal reading: answer the question directly (if any), and connect in plain words how their Sun/Moon/Rising will live this card's energy and how today's sky accompanies it. Don't pile on jargon.
- "shadow": 60-100 words. The card's shadow side: what to watch for, which trap to avoid.
- "advice": 60-100 words. 2-3 concrete steps for this week, as one flowing paragraph.
Write everything in English.`;

  return {
    user,
    schemaHint:
      '{ "headline": string, "keywords": string[], "essence": string, "inPosition": string, "forYou": string, "shadow": string, "advice": string }',
  };
}

export function tarotSynthesisPrompt(
  locale: Locale,
  input: TarotPromptInput,
): { user: string; schemaHint: string } {
  const spread = spreadBlock(locale, input.category, input.cards);
  const ctx = contextBlock(locale, input.ctx, input.question);
  const majors = input.cards.filter((c) => c.card.arcana === 'major').length;
  const reversed = input.cards.filter((c) => c.drawn.reversed).length;
  const elements = input.cards.map((c) => elementName(c.card.element, locale)).join(', ');

  const user =
    locale === 'tr'
      ? `Konu: ${CATEGORY_LABEL[input.category].tr}. Üç kartlık açılım:
${spread}

${ctx}

Açılımın dokusu: ${majors} Büyük Arkana, ${reversed} ters kart; elementler: ${elements}.

Kartları tek tek değil, BİRLİKTE okuyarak açılımın bütün hikâyesini anlat.
- "title": açılımın ruhunu anlatan kısa, şiirsel bir başlık (en fazla 7 kelime).
- "story": 200-280 kelime. Kartların pozisyonlar boyunca anlattığı hikâyeyi bağla: birinden diğerine nasıl bir akış var, birbirlerini nasıl güçlendiriyor ya da dengeliyorlar; Büyük Arkana ve ters kart sayısının, element dengesinin ne anlama geldiğini açıkla; soruya (varsa) net ama kaderci olmayan bir cevap ver.
- "guidance": tam olarak 3 madde; her biri tek cümlelik somut bir tavsiye.
- "affirmation": açılımdan doğan, birinci tekil şahısla yazılmış tek cümlelik bir olumlama.
Tüm metin Türkçe olmalı.`
      : `Topic: ${CATEGORY_LABEL[input.category].en}. The three-card spread:
${spread}

${ctx}

Texture of the spread: ${majors} Major Arcana, ${reversed} reversed; elements: ${elements}.

Read the cards TOGETHER, not one by one, and tell the whole story of the spread.
- "title": a short, poetic title capturing the spread's spirit (max 7 words).
- "story": 200-280 words. Connect the story the cards tell across the positions: how one flows into the next, how they reinforce or balance each other; explain what the number of Major Arcana and reversed cards and the element balance mean; give a clear but non-fatalistic answer to the question (if any).
- "guidance": exactly 3 items, each a one-sentence concrete piece of advice.
- "affirmation": one first-person affirmation sentence born from the spread.
Write everything in English.`;

  return {
    user,
    schemaHint: '{ "title": string, "story": string, "guidance": string[], "affirmation": string }',
  };
}
