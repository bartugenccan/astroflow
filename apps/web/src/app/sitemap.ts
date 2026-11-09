import type { MetadataRoute } from 'next';
import { locales } from '@/i18n';
import { site } from '@/lib/site';

export const dynamic = 'force-static';

const pages = ['', 'privacy/', 'terms/', 'support/'];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${site.url}/${locale}/${page}`,
      changeFrequency: page ? ('yearly' as const) : ('weekly' as const),
      priority: page ? 0.3 : 1,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${site.url}/${l}/${page}`])),
      },
    })),
  );
}
