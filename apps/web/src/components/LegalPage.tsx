import Link from 'next/link';
import { type Locale, getDict } from '@/i18n';
import { site } from '@/lib/site';
import { Header } from './Header';
import { Footer } from './Footer';

export type LegalKind = 'privacy' | 'terms' | 'support';

function formatDate(iso: string, locale: Locale): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function LegalPage({ locale, kind }: { locale: Locale; kind: LegalKind }) {
  const legal = getDict(locale).legal;
  const page = legal[kind];
  const mail = (
    <a className="mail" href={`mailto:${site.email}`}>
      {site.email}
    </a>
  );

  return (
    <>
      <Header locale={locale} path={`${kind}/`} />
      <main id="main" className="container">
        <article className="legal">
          <Link href={`/${locale}/`} className="back-link">
            ← {legal.back}
          </Link>
          <h1 className="display">{page.title}</h1>
          {kind !== 'support' && (
            <p className="updated">
              {legal.updated}: {formatDate(site.legalUpdated, locale)}
            </p>
          )}
          <p className="intro">{page.intro}</p>
          {'emailCta' in page && (
            <p>
              <a className="btn" href={`mailto:${site.email}`}>
                {page.emailCta}
              </a>
            </p>
          )}
          {page.sections.map((s) => (
            <section key={s.h}>
              <h2>{s.h}</h2>
              {s.p.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </section>
          ))}
          {'contact' in page ? (
            <p style={{ marginTop: 40 }}>
              {page.contact} {mail}
            </p>
          ) : (
            <p style={{ marginTop: 40 }}>{mail}</p>
          )}
        </article>
      </main>
      <Footer locale={locale} />
    </>
  );
}

/** Shared metadata for the three legal routes. */
export function legalMetadata(locale: Locale, kind: LegalKind) {
  const page = getDict(locale).legal[kind];
  return {
    title: `${page.title} — AstroFlow`,
    description: page.intro,
    alternates: {
      canonical: `/${locale}/${kind}/`,
      languages: { tr: `/tr/${kind}/`, en: `/en/${kind}/` },
    },
  };
}
