import type { ReactNode } from 'react';
import { display, ui } from '../fonts';
import '../globals.css';

export default function RedirectLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body>{children}</body>
    </html>
  );
}
