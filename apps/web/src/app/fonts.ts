import { Cormorant_Garamond, Manrope } from 'next/font/google';

export const display = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

export const ui = Manrope({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-ui',
  display: 'swap',
});
