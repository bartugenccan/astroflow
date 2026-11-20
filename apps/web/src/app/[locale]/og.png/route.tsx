import { ImageResponse } from 'next/og';
import { getDict, isLocale, locales } from '@/i18n';
import { art, palette, stageBody, surface, text } from '@/lib/tokens';
import { BODY_PATH } from '@/components/Aster';

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
          <svg width="96" height="96" viewBox="0 30 200 170">
            <path d={BODY_PATH} transform="translate(0 7)" fill={stageBody[2].slab} />
            <path d={BODY_PATH} fill={stageBody[2].bottom} />
            <ellipse cx="81" cy="106" rx="7" ry="9" fill={art.ink} />
            <ellipse cx="119" cy="106" rx="7" ry="9" fill={art.ink} />
            <circle cx="78.5" cy="102.5" r="2.6" fill={art.sparkle} />
            <circle cx="116.5" cy="102.5" r="2.6" fill={art.sparkle} />
            <ellipse cx="68" cy="121" rx="8" ry="5" fill={art.blush} />
            <ellipse cx="132" cy="121" rx="8" ry="5" fill={art.blush} />
            <path d="M 91 122 Q 100 132 109 122" stroke={art.ink} strokeWidth="4" strokeLinecap="round" fill="none" />
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
