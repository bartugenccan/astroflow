import type { AuthProvider } from '../../../../generated/prisma/client';

/** A sign-in proof that has been checked against its provider. */
export interface VerifiedIdentity {
  provider: AuthProvider;
  /** Apple/Google `sub`, or the lower-cased address for EMAIL. */
  providerSubject: string;
  email: string | null;
  emailVerified: boolean;
  /** Sealed Sign in with Apple refresh token, when one was obtained. */
  appleRefreshTokenEnc?: string | null;
  /** Name offered by the provider on first sign-in (Apple sends it once). */
  displayName?: string | null;
}
