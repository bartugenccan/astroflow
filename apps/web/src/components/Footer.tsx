import Link from 'next/link';
import { type Locale, getDict } from '@/i18n';
import { site } from '@/lib/site';
import { LogoMark } from './Icons';

export function Footer({ locale }: { locale: Locale }) {
  const d = getDict(locale);
  const t = d.footer;
  const base = `/${locale}/`;
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href={base} className="brand" aria-label="AstroFlow">
              <LogoMark />
              AstroFlow
            </Link>
            <p>{t.tagline}</p>
            <p>
              {t.contact}: <a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
          </div>
          <div>
            <h4>{t.product}</h4>
            <ul>
              <li>
                <a href={`${base}#features`}>{d.nav.features}</a>
              </li>
              <li>
                <a href={`${base}#aster`}>{d.nav.aster}</a>
              </li>
              <li>
                <a href={`${base}#plans`}>{d.nav.plans}</a>
              </li>
              <li>
                <a href={`${base}#faq`}>{d.nav.faq}</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>{t.legal}</h4>
            <ul>
              <li>
                <Link href={`${base}privacy/`}>{t.privacy}</Link>
              </li>
              <li>
                <Link href={`${base}terms/`}>{t.terms}</Link>
              </li>
              <li>
                <Link href={`${base}support/`}>{t.support}</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} AstroFlow. {t.rights}
          </span>
          <span>{t.disclaimer}</span>
        </div>
      </div>
    </footer>
  );
}
