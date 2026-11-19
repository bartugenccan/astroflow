import type { Metadata } from 'next';
import { StoreRedirect } from '@/components/StoreRedirect';

export const metadata: Metadata = {
  title: 'AstroFlow',
  robots: { index: false, follow: false },
};

/** The short link printed on in-app share cards ("…/s") → store (or waitlist) as campaign "share". */
export default function ShareLinkPage() {
  return <StoreRedirect source="share" />;
}
