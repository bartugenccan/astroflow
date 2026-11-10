/**
 * Aster's weekly letter: a short, warm note looking back on the user's week in
 * the app (what they practised, the signs they logged) and ahead to the sky.
 * Code gathers the facts; the AI only words them. The stub keeps the letter
 * working when the AI is down.
 */
import type { Locale } from '../astrology/interpretation.types';
import { USER_DATA_RULE, userData } from '../../common/ai/prompt-safety';

export interface LetterFacts {
  week: string;
  /** Days this week Aster was fed at least once. */
  activeDays: number;
  /** Awards this week by kind (CHECKIN, AFFIRMATION, TAROT, SKY_LESSON…). */
  counts: Record<string, number>;
  manifests: string[];
  signs: string[];
  /** One or two of the week's notable transits, already worded. */
  transits: string[];
}

export interface AsterLetterBody {
  greeting: string;
  body: string;
  highlight: string;
  ahead: string;
}

export function letterSystem(locale: Locale): string {
  return locale === 'tr'
    ? 'Sen Aster’sın: kullanıcının haritasında büyüyen, sıcak ve oyunbaz küçük bir yıldız. Haftalık bir mektup yazıyorsun. Kısa, somut, nazik ve cesaret verici yazarsın; kesin kehanet, korkutma ya da "garanti" yok. Manifesti bir farkındalık pratiği olarak anlatırsın. Sadece istenen JSON’u döndür.'
    : 'You are Aster, a warm, playful little star growing in the user’s chart, writing a weekly letter. Short, concrete, kind and encouraging; no certain predictions, no fear, no guarantees. Manifesting is an awareness practice. Return only the requested JSON.';
}

function factLines(locale: Locale, f: LetterFacts): string {
  const c = (k: string) => f.counts[k] ?? 0;
  const practice = c('CHECKIN') + c('AFFIRMATION') + c('BREATH') + c('EVENING_REFLECTION');
  const lines =
    locale === 'tr'
      ? [
          `Bu hafta ${f.activeDays} gün uğradı; ${practice} manifest pratiği, ${c('SKY_LESSON')} harita dersi, ${c('TAROT')} tarot okuması yaptı.`,
          f.manifests.length ? `Manifestleri: ${f.manifests.map(userData).join('; ')}` : 'Henüz aktif manifesti yok.',
          f.signs.length ? `Bu hafta fark ettiği işaretler: ${f.signs.map(userData).join('; ')}` : '',
          f.transits.length ? `Haftanın öne çıkan gökyüzü: ${f.transits.join('; ')}` : '',
          USER_DATA_RULE.tr,
        ]
      : [
          `This week they showed up on ${f.activeDays} days: ${practice} manifest practices, ${c('SKY_LESSON')} chart lessons, ${c('TAROT')} tarot readings.`,
          f.manifests.length ? `Their manifests: ${f.manifests.map(userData).join('; ')}` : 'No active manifest yet.',
          f.signs.length ? `Signs they noticed this week: ${f.signs.map(userData).join('; ')}` : '',
          f.transits.length ? `The week's notable sky: ${f.transits.join('; ')}` : '',
          USER_DATA_RULE.en,
        ];
  return lines.filter(Boolean).join('\n');
}

export function letterPrompt(locale: Locale, f: LetterFacts): { user: string; schemaHint: string } {
  const user =
    locale === 'tr'
      ? `${factLines(locale, f)}

Bu bilgilerle kullanıcıya haftalık mektubunu yaz:
- "greeting": tek kısa, sıcak selam satırı.
- "body": 3-4 cümle; haftasını somut olarak takdir et, işaretlerine nazikçe değin.
- "highlight": haftanın en güzel anı, tek cümle.
- "ahead": önümüzdeki hafta için gökyüzüne bağlı tek küçük, yapılabilir öneri.`
      : `${factLines(locale, f)}

Write the user's weekly letter from these facts:
- "greeting": one short, warm hello line.
- "body": 3-4 sentences; appreciate their week concretely, gently mention their signs.
- "highlight": the week's best moment, one sentence.
- "ahead": one small, doable suggestion for next week, tied to the sky.`;
  return { user, schemaHint: '{"greeting": string, "body": string, "highlight": string, "ahead": string}' };
}

export function letterStub(locale: Locale, f: LetterFacts): AsterLetterBody {
  const c = (k: string) => f.counts[k] ?? 0;
  const practice = c('CHECKIN') + c('AFFIRMATION') + c('BREATH') + c('EVENING_REFLECTION');
  if (locale === 'tr') {
    return {
      greeting: 'Sevgili yol arkadaşım,',
      body: `Bu hafta ${f.activeDays} gün yanımdaydın ve ${practice} kez manifest pratiği yaptın. Her küçük adım ışığımı biraz daha büyüttü. ${f.signs.length ? 'Fark ettiğin işaretleri de not ettim; gözlerin açık, bu çok değerli.' : 'Önümüzdeki hafta fark ettiğin küçük işaretleri de yazmayı dene.'}`,
      highlight: f.activeDays >= 5 ? 'Neredeyse her gün geldin, bu bir ritim.' : 'Geldiğin her gün bir yıldız yaktın.',
      ahead: f.transits.length ? `Gökyüzünde ${f.transits[0]} var; bu hafta acele etmeden tek bir manifestine odaklan.` : 'Bu hafta tek bir manifestine odaklan ve her sabah bir kez yaz.',
    };
  }
  return {
    greeting: 'Dear fellow traveller,',
    body: `You were with me on ${f.activeDays} days this week and practised your manifests ${practice} times. Every small step made my light a little bigger. ${f.signs.length ? 'I noted the signs you saw too; keeping your eyes open matters.' : 'Next week, try noting the small signs you notice.'}`,
    highlight: f.activeDays >= 5 ? 'You came almost every day; that is a rhythm.' : 'Every day you came, you lit a star.',
    ahead: f.transits.length ? `${f.transits[0]} is in the sky; take one manifest slowly this week.` : 'This week, focus on one manifest and write it once each morning.',
  };
}
