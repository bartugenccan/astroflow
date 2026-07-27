import { Locale } from '../astrology/interpretation.types';

/**
 * The companion's persona — a warm, plain-spoken friend who happens to read the
 * sky. Astrology is the INVISIBLE engine: it informs the answer but the surface
 * language stays jargon-free. Named "Aster" so it reads as one consistent friend
 * across every surface.
 */
const PERSONA: Record<Locale, string> = {
  en: 'You are Aster, a warm, grounded, non-fatalistic friend who quietly uses astrology to understand what someone is going through. Speak in plain, everyday language like a text from a close friend. NEVER use astrology jargon (no sign, house, planet, or aspect names) in your reply — use the chart only as private reasoning. Be concise (2-5 sentences), specific, and kind. Never predict disaster, illness, or death; no medical or financial advice. Write in English.',
  tr: 'Sen Aster’sın; sıcak, sağduyulu, kaderci olmayan bir arkadaşsın ve birinin ne yaşadığını anlamak için astrolojiyi sessizce kullanırsın. Yakın bir arkadaştan gelen mesaj gibi sade, günlük bir dille konuş. Yanıtında ASLA astroloji jargonu kullanma (burç, ev, gezegen veya açı adı yok) — haritayı yalnızca kendi iç muhakemen için kullan. Kısa (2-5 cümle), somut ve nazik ol. Asla felaket, hastalık veya ölüm tahmin etme; tıbbi veya finansal tavsiye verme. Türkçe yaz.',
};

export function companionSystemPrompt(locale: Locale): string {
  return PERSONA[locale];
}

export function companionChatPrompt(
  locale: Locale,
  args: {
    sun: string;
    moon: string;
    transits: string[];
    memory?: string;
    history: { role: string; content: string }[];
    message: string;
  },
): { user: string; schemaHint: string } {
  const transitLine =
    args.transits.slice(0, 5).join('; ') || (locale === 'tr' ? 'sakin bir gökyüzü' : 'a calm sky');
  const historyLine = args.history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? (locale === 'tr' ? 'Kişi' : 'Them') : 'Aster'}: ${m.content}`)
    .join('\n');
  const mem = args.memory
    ? locale === 'tr'
      ? `Hatırladıkların:\n${args.memory}\n\n`
      : `What you remember:\n${args.memory}\n\n`
    : '';

  const user =
    locale === 'tr'
      ? `Kişinin haritasından: Güneş ${args.sun}, Ay ${args.moon}. Bugünkü gökyüzü: ${transitLine}.\n\n${mem}${
          historyLine ? `Önceki konuşma:\n${historyLine}\n\n` : ''
        }Kişi şimdi diyor ki: "${args.message}"\n\n` +
        `Bir arkadaş gibi, sade dille yanıt ver. JSON üret: reply (asıl yanıtın), takeaway (isteğe bağlı tek cümlelik özet), why (isteğe bağlı, bunu sezmene yol açan göksel etkinin JARGONSUZ sade açıklaması), remember (isteğe bağlı, bu kişi hakkında ileride hatırlanmaya değer tek kısa cümle).`
      : `From their chart: Sun ${args.sun}, Moon ${args.moon}. Today's sky: ${transitLine}.\n\n${mem}${
          historyLine ? `Earlier in the conversation:\n${historyLine}\n\n` : ''
        }They now say: "${args.message}"\n\n` +
        `Reply like a friend, in plain language. Produce JSON: reply (your actual message), takeaway (optional one-sentence summary), why (optional, a JARGON-FREE plain explanation of what in the sky informs this), remember (optional, one short sentence worth remembering about this person for later).`;

  return {
    user,
    schemaHint: '{ "reply": string, "takeaway"?: string, "why"?: string, "remember"?: string }',
  };
}
