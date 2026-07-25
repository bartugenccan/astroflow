import { Locale } from "../../i18n";

/**
 * Short theme keywords per astrological house, localized. Mirrors and expands
 * the backend `HOUSE_THEME` map. Kept as a constant (not i18n `t()`) because the
 * typed translation resolver returns strings only — arrays fall through to the
 * key. The first entry is the house's primary theme (shown on the collapsed
 * header chip); the full list renders as a wrapping chip row when expanded.
 */
export const HOUSE_TAGS: Record<Locale, Record<number, string[]>> = {
  en: {
    1: ["Self", "Identity", "Body", "Appearance", "Vitality"],
    2: ["Money", "Values", "Self-worth", "Possessions", "Security"],
    3: ["Communication", "Siblings", "Learning", "Curiosity", "Neighbors"],
    4: ["Home", "Roots", "Family", "Foundations", "Belonging"],
    5: ["Creativity", "Romance", "Children", "Play", "Self-expression"],
    6: ["Work", "Health", "Routines", "Service", "Habits"],
    7: ["Relationships", "Partners", "Marriage", "Others", "Balance"],
    8: ["Intimacy", "Shared resources", "Transformation", "Depth", "Rebirth"],
    9: ["Philosophy", "Travel", "Beliefs", "Meaning", "Expansion"],
    10: ["Career", "Reputation", "Ambition", "Public role", "Legacy"],
    11: ["Friends", "Community", "Hopes", "Networks", "Future"],
    12: ["Subconscious", "Solitude", "Spirituality", "Dreams", "Closure"],
  },
  tr: {
    1: ["Benlik", "Kimlik", "Beden", "Görünüş", "Canlılık"],
    2: ["Para", "Değerler", "Öz değer", "Sahip olunanlar", "Güvenlik"],
    3: ["İletişim", "Kardeşler", "Öğrenme", "Merak", "Komşular"],
    4: ["Ev", "Kökler", "Aile", "Temeller", "Aidiyet"],
    5: ["Yaratıcılık", "Aşk", "Çocuklar", "Oyun", "Kendini ifade"],
    6: ["İş", "Sağlık", "Rutinler", "Hizmet", "Alışkanlıklar"],
    7: ["İlişkiler", "Partnerler", "Evlilik", "Ötekiler", "Denge"],
    8: ["Yakınlık", "Ortak kaynaklar", "Dönüşüm", "Derinlik", "Yeniden doğuş"],
    9: ["Felsefe", "Seyahat", "İnançlar", "Anlam", "Genişleme"],
    10: ["Kariyer", "İtibar", "Hırs", "Toplumsal rol", "Miras"],
    11: ["Arkadaşlar", "Topluluk", "Umutlar", "Ağlar", "Gelecek"],
    12: ["Bilinçaltı", "Yalnızlık", "Maneviyat", "Rüyalar", "Kapanış"],
  },
};

/** All theme tags for a house (falls back to English, then empty). */
export function houseTags(locale: Locale, house: number): string[] {
  return HOUSE_TAGS[locale]?.[house] ?? HOUSE_TAGS.en[house] ?? [];
}

/** The single primary theme for a house — used on the collapsed header chip. */
export function primaryHouseTag(locale: Locale, house: number): string {
  return houseTags(locale, house)[0] ?? "";
}
