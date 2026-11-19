import type { Metadata } from 'next';
import { StoreRedirect } from '@/components/StoreRedirect';

export const metadata: Metadata = {
  title: 'AstroFlow',
  robots: { index: false, follow: false },
};

/** Bio / campaign link: /get?c=tiktok, /get?c=ig … → store (or waitlist) tagged with that campaign. */
export default function GetPage() {
  return <StoreRedirect />;
}
