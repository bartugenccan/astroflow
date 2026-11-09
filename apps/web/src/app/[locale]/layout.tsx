import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import { getDict, isLocale, locales } from '@/i18n';
import { site } from '@/lib/site';
import { display, ui } from '../fonts';
import '../globals.css';

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: '#060810',
  colorScheme: 'dark',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDict(locale).meta;
  return {
    metadataBase: new URL(site.url),
    title: t.title,
    description: t.description,
    applicationName: 'AstroFlow',
    alternates: {
      canonical: `/${locale}/`,
      languages: { tr: '/tr/', en: '/en/', 'x-default': '/en/' },
    },
    openGraph: {
      type: 'website',
      siteName: 'AstroFlow',
      title: t.title,
      description: t.description,
      url: `/${locale}/`,
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      images: [{ url: `/${locale}/og.png`, width: 1200, height: 630, alt: t.ogAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.title,
      description: t.description,
      images: [`/${locale}/og.png`],
    },
    icons: { icon: '/favicon.png', apple: '/icon.png' },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={`${display.variable} ${ui.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          {locale === 'tr' ? 'İçeriğe geç' : 'Skip to content'}
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
