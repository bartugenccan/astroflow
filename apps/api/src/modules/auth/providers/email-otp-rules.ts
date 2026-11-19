/**
 * When a sign-in code may be sent. Pure, so the limits are unit-tested
 * (`test/email-otp-rules.test.mjs`); `EmailOtpService.start` gathers the
 * counts inside a per-address lock and acts on the verdict.
 */

export const OTP_LIMITS = {
  /** An address waits this long between two codes. */
  cooldownMs: 60_000,
  /** At most `perWindow` codes per address in this window… */
  windowMs: 15 * 60_000,
  perWindow: 3,
  /** …and `perDay` per address per day. */
  perDay: 10,
} as const;

export interface OtpSendStats {
  /** When the address's latest code was created (epoch ms), if it has one today. */
  lastSentAt: number | null;
  /** The address's codes inside `OTP_LIMITS.windowMs`. */
  inWindow: number;
  /** The address's codes in the last day. */
  inDay: number;
  /** Codes sent to any address in the last hour. */
  globalLastHour: number;
}

/**
 * - `ok`: send.
 * - `cooldown` / `address_limit`: 429 for this address.
 * - `global_limit`: 503 — sign-in is paused for everyone for a while (a burst
 *   across many addresses is abuse or a bug, and every code costs a mail).
 */
export type OtpSendVerdict = 'ok' | 'cooldown' | 'address_limit' | 'global_limit';

export function otpSendVerdict(stats: OtpSendStats, now: number, hourlyGlobalCap: number): OtpSendVerdict {
  if (stats.lastSentAt !== null && now - stats.lastSentAt < OTP_LIMITS.cooldownMs) return 'cooldown';
  if (stats.inWindow >= OTP_LIMITS.perWindow || stats.inDay >= OTP_LIMITS.perDay) return 'address_limit';
  if (stats.globalLastHour >= hourlyGlobalCap) return 'global_limit';
  return 'ok';
}
