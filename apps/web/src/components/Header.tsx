import Link from 'next/link';
import { type Locale, getDict, otherLocale } from '@/i18n';
import { LogoMark } from './Icons';

/** `path` is the current page below the locale ('' for home, 'privacy/' …) so the switch keeps you in place. */
export function Header({ locale, path = '' }: { locale: Locale; path?: string }) {
  const t = getDict(locale).nav;
  const home = `/${locale}/`;
  const other = otherLocale(locale);
  return (
    <header className="site-header">
      <div className="container">
        <Link href={home} className="brand" aria-label="AstroFlow">
          <LogoMark />
          AstroFlow
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <a href={`${home}#features`}>{t.features}</a>
          <a href={`${home}#aster`}>{t.aster}</a>
          <a href={`${home}#privacy`}>{t.privacy}</a>
          <a href={`${home}#plans`}>{t.plans}</a>
          <a href={`${home}#faq`}>{t.faq}</a>
        </nav>
        <div className="header-actions">
          <Link href={`/${other}/${path}`} className="lang-switch" hrefLang={other} lang={other}>
            {t.switchTo}
          </Link>
          <a href={`${home}#waitlist`} className="btn btn-sm header-cta">
            {t.cta}
          </a>
        </div>
      </div>
    </header>
  );
}
