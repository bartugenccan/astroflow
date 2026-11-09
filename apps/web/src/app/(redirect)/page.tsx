import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AstroFlow',
  alternates: { canonical: '/en/', languages: { tr: '/tr/', en: '/en/', 'x-default': '/en/' } },
  robots: { index: false, follow: true },
};

/** Static export has no middleware: pick the language in the browser, before paint. */
const pickLocale = `(function(){try{var l=(navigator.languages||[navigator.language||'']).join(',').toLowerCase();location.replace(/(^|,)tr/.test(l)?'/tr/':'/en/');}catch(e){location.replace('/en/');}})();`;

export default function RootRedirect() {
  return (
    <main className="redirect">
      <script dangerouslySetInnerHTML={{ __html: pickLocale }} />
      <noscript>
        <meta httpEquiv="refresh" content="0; url=/en/" />
      </noscript>
      <div>
        <p className="display" style={{ fontSize: 40, color: 'var(--gold-100)', margin: 0 }}>
          AstroFlow
        </p>
        <p>
          <Link href="/en/">English</Link> · <Link href="/tr/">Türkçe</Link>
        </p>
      </div>
    </main>
  );
}
