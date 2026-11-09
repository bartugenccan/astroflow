import { ImageResponse } from 'next/og';
import { getDict, isLocale, locales } from '@/i18n';

/** Served as /{locale}/og.png — a real .png path so static hosting sends image/png. */
export const dynamic = 'force-static';
const size = { width: 1200, height: 630 };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(isLocale(locale) ? locale : 'en');
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 96px',
          background: 'radial-gradient(ellipse at 70% 20%, #1a2350 0%, #0A0E1C 55%, #060810 100%)',
          color: '#F3EFE4',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
          <svg width="72" height="72" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="29" fill="none" stroke="#E7CD8F" strokeWidth="2.4" />
            <path d="M28.5 15.5a17 17 0 1 0 9.5 31.1A14.6 14.6 0 0 1 28.5 15.5z" fill="#E1C47C" />
            <path d="M40 21.5l1.5 5.5 5.5 1.3-5.5 1.3-1.5 5.6-1.5-5.6-5.5-1.3 5.5-1.3z" fill="#E7CD8F" />
          </svg>
          <div style={{ fontSize: 44, color: '#EFDFB8' }}>AstroFlow</div>
        </div>
        <div style={{ fontSize: 104, lineHeight: 1, color: '#F7F0DD', marginBottom: 28 }}>{t.hero.title}</div>
        <div style={{ fontSize: 34, lineHeight: 1.35, color: 'rgba(243,239,228,0.7)', maxWidth: 900 }}>
          {t.meta.title.split('—')[1]?.trim() ?? t.hero.tagline}
        </div>
        <div style={{ display: 'flex', marginTop: 48, fontSize: 24, color: '#E7CD8F', letterSpacing: 4 }}>
          iOS · ANDROID · TÜRKÇE · ENGLISH
        </div>
      </div>
    ),
    size,
  );
}
