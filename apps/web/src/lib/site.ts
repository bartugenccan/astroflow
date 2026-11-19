/** Build-time site settings (see .env.example). */
export const site = {
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getastroflow.com').replace(/\/$/, ''),
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, ''),
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'astroflowhq@gmail.com',
  name: 'AstroFlow',
  /**
   * App Store product page, e.g. https://apps.apple.com/app/id6835863763.
   * Empty until the app is live: the site then keeps the waitlist and /get, /s
   * send people to it instead of the store.
   */
  appStoreUrl: (process.env.NEXT_PUBLIC_APP_STORE_URL ?? '').trim(),
  /**
   * App Store Connect provider token (App Analytics → Campaigns → "pt").
   * Without it the store opens but the `ct` campaign isn't counted.
   */
  appStoreProviderToken: (process.env.NEXT_PUBLIC_APP_STORE_PT ?? '').trim(),
  /** Date shown on the legal pages. Bump when their text changes. */
  legalUpdated: '2026-11-19',
};
