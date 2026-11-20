import { DM_Sans, Nunito } from 'next/font/google';

/** Same pair as the app: Nunito for headings and buttons, DM Sans for body. */
export const display = Nunito({
  subsets: ['latin', 'latin-ext'],
  weight: ['700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

export const ui = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '700'],
  variable: '--font-ui',
  display: 'swap',
});
