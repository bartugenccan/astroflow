import type { ReactNode } from 'react';
import { cssVariables } from '@/lib/tokens';
import { display, ui } from '../fonts';
import '../globals.css';

export default function RedirectLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssVariables() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
