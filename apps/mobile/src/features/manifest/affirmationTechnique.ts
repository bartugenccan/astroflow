import type { Locale } from "../../i18n";

/**
 * A light technique check for an affirmation while it is being written.
 * Pure and on-device (no AI, nothing leaves the phone). It only gives gentle
 * hints, it never blocks saving: Turkish person/tense detection from suffixes
 * is a heuristic and will sometimes be wrong.
 *
 * The four habits and where they come from (also noted in practice.*.ts):
 *  - firstPerson / present — the usual convention of manifestation practice
 *    ("I am…", said as if it is already true). A convention, not a research finding.
 *  - positive — say what you want, not what you want to avoid.
 *  - believable — Wood, Perunovic & Lee (2009, Psychological Science): sweeping
 *    self-statements can backfire for people who doubt them, so a "bridge"
 *    sentence ("I'm learning to…", "a little more each day") is suggested instead.
 */
export type TechniqueKey = "firstPerson" | "present" | "positive" | "believable";

export interface TechniqueCheck {
  key: TechniqueKey;
  ok: boolean;
}

/** Below this many words there is too little to judge, so no hints are shown. */
export const TECHNIQUE_MIN_WORDS = 3;

/** Lowercase and fold Turkish letters to ASCII, so "ı" and a typed "i" read the same. */
export function foldText(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[’'`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const TR = {
  // ben / bana / beni / benim, or a verb in the 1st person singular (…yorum, …ım, …rım, …dım).
  firstPerson: /(^|[^a-z])(ben|bana|beni|benim|bende|benden)([^a-z]|$)|[a-z]{2,}(yorum|iyorum|uyorum|[iu]m|rim|rum|dim|dum|tim|tum|yim|yum)([^a-z]|$)/,
  // Future and wishing: …acağım / …ecek, istiyorum, umarım, dilerim, keşke, inşallah.
  notPresent: /[a-z]+(acag|eceg)[a-z]*|[a-z]+(acak|ecek)([^a-z]|$)|(^|[^a-z])(istiyorum|isterim|umarim|dilerim|keske|insallah|bir gun)([^a-z]|$)/,
  // değil / yok / asla / hiç, and negated verbs (…mıyorum, …mayacağım).
  negative: /(^|[^a-z])(degil|yok|asla|hic|hicbir)([^a-z]|$)|[a-z]+(m[iu]yor|mayacag|meyeceg|mayacak|meyecek|mazsam|mezsem)/,
  // Sweeping claims that are hard to believe on a doubtful day.
  sweeping: /(^|[^a-z])(her zaman|herkes|mukemmel|kusursuz|aninda|bir gecede|zahmetsizce|milyon|milyar|sonsuz)([^a-z]|$)/,
};

const EN = {
  firstPerson: /(^|[^a-z'])(i|i'm|im|my|me|mine|myself)([^a-z']|$)/,
  notPresent: /(^|[^a-z'])(will|i'll|going to|gonna|want to|wish|hope|someday|one day|soon)([^a-z']|$)/,
  negative: /(^|[^a-z'])(not|no|never|don't|dont|won't|can't|cannot|isn't|stop|without|no longer)([^a-z']|$)/,
  sweeping: /(^|[^a-z'])(always|everyone|everybody|perfect|perfectly|instantly|overnight|effortlessly|millions?|billions?|endless)([^a-z']|$)/,
};

/**
 * The four checks for `text`, or `[]` when it is too short to judge.
 * `locale` picks the rules; Turkish text is folded first, so typing without
 * Turkish letters ("basariliyim") works the same.
 */
export function checkAffirmation(text: string, locale: Locale): TechniqueCheck[] {
  const folded = foldText(text);
  const words = folded.split(" ").filter(Boolean);
  if (words.length < TECHNIQUE_MIN_WORDS) return [];
  const rules = locale === "tr" ? TR : EN;
  return [
    { key: "firstPerson", ok: rules.firstPerson.test(folded) },
    { key: "present", ok: !rules.notPresent.test(folded) },
    { key: "positive", ok: !rules.negative.test(folded) },
    { key: "believable", ok: !rules.sweeping.test(folded) },
  ];
}
