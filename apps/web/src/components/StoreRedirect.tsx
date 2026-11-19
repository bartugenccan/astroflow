import Link from 'next/link';
import { site } from '@/lib/site';

/** Campaign names reach App Store Connect as `ct`; keep them short and boring. */
const SAFE_SOURCE = '^[a-z0-9_-]{1,40}$';

/**
 * Short links for social bios and share cards (/get?c=tiktok, /s).
 * The site is a static export with no server, so the hop happens in the
 * browser before paint:
 *  - app live (NEXT_PUBLIC_APP_STORE_URL set) and not Android → App Store
 *    product page with `ct=<source>` (and `pt` when the provider token is set);
 *  - otherwise → the landing waitlist in the visitor's language.
 * `source` fixes the campaign (/s = "share"); without it the `c` query
 * parameter is used, falling back to "web".
 */
export function StoreRedirect({ source }: { source?: string }) {
  const config = JSON.stringify({
    store: site.appStoreUrl,
    pt: site.appStoreProviderToken,
    source: source ?? null,
    safe: SAFE_SOURCE,
  }).replace(/</g, '\\u003c');

  const script = `(function(){var c=${config};function go(u){location.replace(u);}try{
var src=c.source;if(!src){var q=new URLSearchParams(location.search).get('c');src=q?q.toLowerCase():'web';}
if(!new RegExp(c.safe).test(src))src='web';
var langs=(navigator.languages||[navigator.language||'']).join(',').toLowerCase();
var lang=/(^|,)tr/.test(langs)?'tr':'en';
var android=/android/i.test(navigator.userAgent||'');
if(c.store&&!android){var u=c.store+(c.store.indexOf('?')<0?'?':'&')+(c.pt?'pt='+encodeURIComponent(c.pt)+'&':'')+'ct='+encodeURIComponent(src)+'&mt=8';go(u);}
else{go('/'+lang+'/#waitlist');}
}catch(e){go('/en/#waitlist');}})();`;

  const fallback = site.appStoreUrl || '/en/#waitlist';

  return (
    <main className="redirect">
      <script dangerouslySetInnerHTML={{ __html: script }} />
      <noscript>
        <meta httpEquiv="refresh" content={`0; url=${fallback}`} />
      </noscript>
      <div>
        <p className="display" style={{ fontSize: 40, color: 'var(--gold-100)', margin: 0 }}>
          AstroFlow
        </p>
        <p>
          {site.appStoreUrl ? <a href={site.appStoreUrl}>App Store</a> : null}
          {site.appStoreUrl ? ' · ' : null}
          <Link href="/tr/#waitlist">Türkçe</Link> · <Link href="/en/#waitlist">English</Link>
        </p>
      </div>
    </main>
  );
}
