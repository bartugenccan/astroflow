import { en, type Dict } from './en';
import { tr } from './tr';

export const locales = ['tr', 'en'] as const;
export type Locale = (typeof locales)[number];

const dictionaries: Record<Locale, Dict> = { tr, en };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDict(locale: Locale): Dict {
  return dictionaries[locale];
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'tr' ? 'en' : 'tr';
}

export type { Dict };
