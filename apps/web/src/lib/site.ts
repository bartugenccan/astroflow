/** Build-time site settings (see .env.example). */
export const site = {
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getastroflow.com').replace(/\/$/, ''),
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, ''),
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hello@getastroflow.com',
  name: 'AstroFlow',
  /** Date shown on the legal pages. Bump when their text changes. */
  legalUpdated: '2026-10-08',
};
