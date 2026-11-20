import { ImageResponse } from 'next/og';
import { getDict, isLocale, locales } from '@/i18n';
import { palette, surface, text } from '@/lib/tokens';

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
          background: `radial-gradient(ellipse at 75% 15%, ${surface.nebulaViolet} 0%, ${surface.base} 55%, ${surface.deep} 100%)`,
          color: text.primary,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
          <svg width="72" height="72" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="29" fill="none" stroke={palette.star.face} strokeWidth="3" />
            <path d="M28.5 15.5a17 17 0 1 0 9.5 31.1A14.6 14.6 0 0 1 28.5 15.5z" fill={palette.star.face} />
            <path d="M40 21.5l1.5 5.5 5.5 1.3-5.5 1.3-1.5 5.6-1.5-5.6-5.5-1.3 5.5-1.3z" fill={palette.cloud.face} />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 900, color: palette.star.face }}>AstroFlow</div>
        </div>
        <div style={{ fontSize: 104, fontWeight: 900, lineHeight: 1, color: text.primary, marginBottom: 28 }}>{t.hero.title}</div>
        <div style={{ fontSize: 34, lineHeight: 1.35, color: text.secondary, maxWidth: 900 }}>
          {t.meta.title.split('—')[1]?.trim() ?? t.hero.tagline}
        </div>
        <div style={{ display: 'flex', marginTop: 48, fontSize: 24, color: palette.candy.face, letterSpacing: 4 }}>
          iOS · ANDROID · TÜRKÇE · ENGLISH
        </div>
      </div>
    ),
    size,
  );
}
