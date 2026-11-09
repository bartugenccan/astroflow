/**
 * Aster's voice for a journey discovery: two short sentences about one real
 * transit to the user's natal chart. The transit is chosen by code; the AI
 * only words it. Stubs keep the journey working when the AI is down.
 */
import type { Locale } from '../astrology/interpretation.types';
import type { PlanTransit } from './plan-rules';

export interface DiscoveryText {
  title: string;
  body: string;
}

export function discoverySystem(locale: Locale): string {
  return locale === 'tr'
    ? 'Sen Aster’sın: kullanıcının haritasında büyüyen, sıcak ve oyunbaz küçük bir yıldız. Kısa, somut ve nazik yazarsın; korkutmazsın, kesin kehanette bulunmazsın. Sadece istenen JSON’u döndür.'
    : 'You are Aster, a warm, playful little star growing in the user’s chart. You write short, concrete and kind; you never frighten or make certain predictions. Return only the requested JSON.';
}

export function discoveryPrompt(locale: Locale, t: PlanTransit): { user: string; schemaHint: string } {
  const transit = `${t.transitPlanet} in ${t.transitSign} ${t.aspect.toLowerCase()} natal ${t.natalPlanet} (orb ${t.orb}°, ${t.nature})`;
  const user =
    locale === 'tr'
      ? `Gökyüzü yolculuğundan döndün ve kullanıcının haritasında bugün şunu gördün: ${transit}. Bunu ona anlat: "title" en fazla 6 kelimelik bir başlık; "body" tam 2 cümle — ilki bu etkinin bugün nasıl hissettirebileceği, ikincisi küçük, yapılabilir bir öneri. Gezegen adlarını Türkçe yaz.`
      : `You are back from a sky journey and saw this in the user's chart today: ${transit}. Tell them: "title" is at most 6 words; "body" is exactly 2 sentences — first how it may feel today, then one small, doable suggestion.`;
  return { user, schemaHint: '{"title": string, "body": string}' };
}

const PLANET_TR: Record<string, string> = {
  Sun: 'Güneş', Moon: 'Ay', Mercury: 'Merkür', Venus: 'Venüs', Mars: 'Mars',
  Jupiter: 'Jüpiter', Saturn: 'Satürn', Uranus: 'Uranüs', Neptune: 'Neptün', Pluto: 'Plüton',
};

/** Dative ("to …") forms — Turkish vowel harmony differs per planet. */
const PLANET_TR_DATIVE: Record<string, string> = {
  Sun: 'Güneş’e', Moon: 'Ay’a', Mercury: 'Merkür’e', Venus: 'Venüs’e', Mars: 'Mars’a',
  Jupiter: 'Jüpiter’e', Saturn: 'Satürn’e', Uranus: 'Uranüs’e', Neptune: 'Neptün’e', Pluto: 'Plüton’a',
};

export function discoveryStub(locale: Locale, t: PlanTransit): DiscoveryText {
  if (locale === 'tr') {
    const tp = PLANET_TR[t.transitPlanet] ?? t.transitPlanet;
    const np = PLANET_TR[t.natalPlanet] ?? t.natalPlanet;
    const npTo = PLANET_TR_DATIVE[t.natalPlanet] ?? np;
    const body =
      t.nature === 'challenging'
        ? `${tp} bugün doğum haritandaki ${npTo} sürtünüyor; biraz gerginlik hissedebilirsin. Acele etme, bir nefes al ve tek bir küçük adım seç.`
        : `${tp} bugün doğum haritandaki ${npTo} destek veriyor; akış senden yana. Ertelediğin küçük bir şeye bugün başla.`;
    return { title: `${tp} → ${np}`, body };
  }
  const body =
    t.nature === 'challenging'
      ? `${t.transitPlanet} is rubbing against your natal ${t.natalPlanet} today, so things may feel a bit tense. Slow down, take a breath and pick one small step.`
      : `${t.transitPlanet} is supporting your natal ${t.natalPlanet} today, so the flow is with you. Start one small thing you've been putting off.`;
  return { title: `${t.transitPlanet} → ${t.natalPlanet}`, body };
}
