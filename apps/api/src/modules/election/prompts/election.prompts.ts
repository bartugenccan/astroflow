import { Locale } from '../../astrology/interpretation.types';
import { ELECTION_PROFILES } from '../election.events';
import { shortDate, signName } from '../election.labels';
import { ElectionCheck, ElectionSearch } from '../election.types';
import { USER_DATA_RULE, userData } from '../../../common/ai/prompt-safety';

const SYSTEM: Record<Locale, string> = {
  en: `You are a seasoned electional astrologer who explains timing in plain, warm language. You are given factors that were already COMPUTED from an ephemeris — use only those; never invent planetary positions, dates or hours that are not in the input. You are not fatalistic: a weak day means friction, not doom, and the reader always decides. Never promise legal, financial or relationship outcomes. Speak directly to the reader as "you". Avoid jargon; when you name a factor, say in a few words what it means for them.`,
  tr: `Zamanlamayı sade ve sıcak bir dille anlatan deneyimli bir seçim (eleksiyon) astroloğusun. Sana efemeristen HESAPLANMIŞ faktörler veriliyor — yalnızca bunları kullan; girdide olmayan gezegen konumu, tarih ya da saat uydurma. Kaderci değilsin: zayıf bir gün felaket değil, sürtüşme demektir ve kararı her zaman okuyucu verir. Hukuki, finansal ya da ilişkisel sonuç vaat etme. Okuyucuya doğrudan "sen" diye hitap et. Jargondan kaçın; bir faktörü andığında onun okuyucu için ne demek olduğunu birkaç kelimeyle söyle.`,
};

export function electionSystemPrompt(locale: Locale): string {
  return SYSTEM[locale];
}

const VERDICT: Record<Locale, Record<string, string>> = {
  en: { excellent: 'excellent', good: 'good', mixed: 'mixed', avoid: 'better avoided' },
  tr: { excellent: 'çok uygun', good: 'uygun', mixed: 'karışık', avoid: 'kaçınılması iyi olur' },
};

function eventLine(r: ElectionCheck | ElectionSearch, locale: Locale): string {
  const name = ELECTION_PROFILES[r.event.id].name[locale];
  if (!r.event.fromText) return name;
  return locale === 'tr'
    ? `${name} (okuyucunun kendi ifadesi: ${userData(r.event.fromText)}; ${USER_DATA_RULE.tr})`
    : `${name} (in the reader's words: ${userData(r.event.fromText)}; ${USER_DATA_RULE.en})`;
}

export function electionCheckPrompt(locale: Locale, r: ElectionCheck): { user: string; schemaHint: string } {
  const factors = r.factors.map((f) => `- [${f.tone}${f.impact >= 0 ? ' +' : ' '}${f.impact}] ${f.label}`).join('\n');
  const hours = r.hours
    .map((h) => `- ${h.from}–${h.to} (${h.score}/100): ${h.highlights.join(', ')}`)
    .join('\n');
  const alts = r.alternatives.length
    ? r.alternatives.map((a) => `- ${a.date} (${shortDate(a.date, locale)}): ${a.score}/100`).join('\n')
    : locale === 'tr' ? '- (iki hafta içinde belirgin şekilde daha iyi bir gün yok)' : '- (no clearly better day within two weeks)';

  const user =
    locale === 'tr'
      ? `Okuyucu şunu soruyor: "${eventLine(r, locale)} için ${r.date} (${shortDate(r.date, locale)}) uygun mu?" Yer: ${r.place.name}.
Hesaplanan sonuç: ${r.score}/100 — ${VERDICT.tr[r.verdict]}.

Günün faktörleri (etki puanlarıyla):
${factors}

O gün için en iyi saatler (yerel saat, olay haritasına göre):
${hours}

Yakındaki daha iyi alternatifler:
${alts}

Alanlar:
- "summary": soruya doğrudan cevap veren 2-3 cümle (uygun mu, ne kadar, neden kısaca).
- "why": 130-180 kelime. En etkili faktörleri günlük dille açıkla: her biri bu olay için neden önemli.
- "advice": 80-120 kelime. Bu tarihte yapılacaksa hangi saatleri seçmeli ve nasıl; gün zayıfsa alternatif tarihleri açıkça öner.
- "caution": 40-80 kelime. Dikkat edilmesi gereken somut noktalar.
Tüm metin Türkçe olmalı.`
      : `The reader asks: "Is ${r.date} (${shortDate(r.date, locale)}) good for ${eventLine(r, locale)}?" Place: ${r.place.name}.
Computed result: ${r.score}/100 — ${VERDICT.en[r.verdict]}.

The day's factors (with score impact):
${factors}

Best hours that day (local time, from the event chart):
${hours}

Nearby better alternatives:
${alts}

Fields:
- "summary": 2-3 sentences that answer the question directly (is it good, how good, briefly why).
- "why": 130-180 words. Explain the most influential factors in everyday language: why each matters for this event.
- "advice": 80-120 words. If they go ahead on this date, which hours to pick and how; if the day is weak, clearly recommend the alternatives.
- "caution": 40-80 words. Concrete things to watch for.
Write everything in English.`;

  return { user, schemaHint: '{ "summary": string, "why": string, "advice": string, "caution": string }' };
}

export function electionSearchPrompt(locale: Locale, r: ElectionSearch): { user: string; schemaHint: string } {
  const picks = r.top
    .map((p) => {
      const good = p.factors.filter((f) => f.tone === 'good').slice(0, 2).map((f) => f.label).join('; ');
      const hour = p.bestHour
        ? `${p.bestHour.from}–${p.bestHour.to}, ${locale === 'tr' ? 'yükselen' : 'rising'} ${signName(p.bestHour.ascendant, locale)}`
        : '—';
      return `- ${p.date} (${shortDate(p.date, locale)}): ${p.score}/100 · ${hour} · ${good}`;
    })
    .join('\n');
  const avoid = r.avoid.length
    ? r.avoid.map((a) => `- ${a.label}: ${a.from} → ${a.to}`).join('\n')
    : '- —';

  const user =
    locale === 'tr'
      ? `Okuyucu ${r.place.name} için "${eventLine(r, locale)}" adına ${r.from} ile ${r.to} arasında en uygun tarihleri arıyor.

Hesaplanan en iyi tarihler:
${picks}

Kaçınılacak dönemler:
${avoid}

Alanlar:
- "summary": 120-170 kelime. Hangi tarihler öne çıkıyor ve neden (yalnızca verilen faktörlerle), hangi dönemlerden uzak durmalı, seçim yaparken nasıl düşünmeli.
- "tips": tam olarak 3 madde; her biri tek cümlelik somut öneri.
Tüm metin Türkçe olmalı.`
      : `The reader is looking for the best dates for "${eventLine(r, locale)}" in ${r.place.name}, between ${r.from} and ${r.to}.

Computed best dates:
${picks}

Periods to avoid:
${avoid}

Fields:
- "summary": 120-170 words. Which dates stand out and why (only from the given factors), which periods to stay away from, how to think about choosing.
- "tips": exactly 3 items, each a one-sentence concrete suggestion.
Write everything in English.`;

  return { user, schemaHint: '{ "summary": string, "tips": string[] }' };
}

/** Prompt for mapping the reader's own words to one of the event profiles. */
export function electionClassifyPrompt(text: string): { user: string; schemaHint: string } {
  const list = Object.values(ELECTION_PROFILES)
    .map((p) => `- ${p.id}: ${p.name.en}`)
    .join('\n');
  return {
    user: `Map the event below to the closest id from this list. If nothing fits, use "new_beginning".\n${list}\n\nEvent: ${userData(text)}\n${USER_DATA_RULE.en}`,
    schemaHint: '{ "eventId": string }',
  };
}
