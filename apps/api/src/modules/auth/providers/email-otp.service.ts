import { createHash, hkdfSync, randomInt, timingSafeEqual } from 'crypto';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ResendMailer } from './resend.mailer';
import type { VerifiedIdentity } from './verified-identity';
import { OTP_LIMITS, otpSendVerdict } from './email-otp-rules';

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
/** Wrong guesses across all of an address's codes before it is locked for the hour. */
const MAX_FAILURES_PER_HOUR = 10;
const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Passwordless email sign-in with a 6-digit code. Codes are stored hashed
 * (bound to the address and a server secret), expire after 10 minutes, allow
 * five guesses, and an address gets one code a minute, at most three per 15
 * minutes and ten per day (`email-otp-rules.ts`). Across all addresses at
 * most OTP_HOURLY_GLOBAL codes go out per hour; per IP the @OtpRoute limit
 * applies on top. Guesses are counted across codes too, so requesting fresh
 * codes doesn't reset the guess budget.
 */
@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);
  private readonly pepper: string;
  private readonly devLog: boolean;
  private readonly hourlyGlobalCap: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: ResendMailer,
    config: ConfigService,
  ) {
    // Own key, derived: a code hash never shares key material with token signing.
    this.pepper = Buffer.from(
      hkdfSync('sha256', config.getOrThrow<string>('JWT_DEVICE_SECRET'), '', 'astroflow/email-otp', 32),
    ).toString('hex');
    this.devLog =
      config.get<boolean>('AUTH_EMAIL_DEV_LOG') === true && config.get<string>('NODE_ENV') !== 'production';
    this.hourlyGlobalCap = config.get<number>('OTP_HOURLY_GLOBAL') ?? 200;
  }

  static normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  async start(rawEmail: string, locale: 'en' | 'tr'): Promise<void> {
    const email = EmailOtpService.normalize(rawEmail);
    if (!this.mailer.configured && !this.devLog) {
      throw new ServiceUnavailableException('Email sign-in is not configured');
    }
    const now = Date.now();
    // Codes older than a day no longer count toward any limit: drop them.
    await this.prisma.emailOtp.deleteMany({ where: { createdAt: { lt: new Date(now - DAY_MS) } } });

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    // Count and create under a per-address lock, so parallel requests for one
    // address cannot all pass the same count.
    const { verdict, codeId } = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`otp:${email}`}))`;
      const [inWindow, inDay, last, globalLastHour] = await Promise.all([
        tx.emailOtp.count({ where: { email, createdAt: { gt: new Date(now - OTP_LIMITS.windowMs) } } }),
        tx.emailOtp.count({ where: { email } }),
        tx.emailOtp.findFirst({ where: { email }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        tx.emailOtp.count({ where: { createdAt: { gt: new Date(now - HOUR_MS) } } }),
      ]);
      const result = otpSendVerdict(
        { lastSentAt: last?.createdAt.getTime() ?? null, inWindow, inDay, globalLastHour },
        now,
        this.hourlyGlobalCap,
      );
      if (result !== 'ok') return { verdict: result, codeId: null };
      const row = await tx.emailOtp.create({
        data: { email, codeHash: this.hash(email, code), expiresAt: new Date(now + CODE_TTL_MS) },
        select: { id: true },
      });
      return { verdict: result, codeId: row.id };
    });
    if (verdict === 'global_limit') {
      // Never log the address; the count alone says what happened.
      this.logger.warn(`hourly sign-in code cap reached (${this.hourlyGlobalCap}/h)`);
      throw new ServiceUnavailableException('Sign-in codes are paused for a moment. Try again later.');
    }
    if (verdict !== 'ok') {
      throw new HttpException('Too many codes requested. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (this.mailer.configured) {
      const sent = await this.mailer.sendSignInCode(email, code, locale);
      if (!sent && !this.devLog) {
        // A code that never left must not cost the person their cooldown or
        // their daily quota: forget it, so a retry can go out straight away.
        if (codeId) await this.prisma.emailOtp.delete({ where: { id: codeId } }).catch(() => undefined);
        throw new ServiceUnavailableException('Could not send the code');
      }
    }
    if (this.devLog) this.logger.log(`[dev] sign-in code for ${email}: ${code}`);
  }

  /** Consumes the latest live code for the address, or throws a generic 400. */
  async verify(rawEmail: string, code: string): Promise<VerifiedIdentity> {
    const email = EmailOtpService.normalize(rawEmail);
    const otp = await this.prisma.emailOtp.findFirst({
      where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    const invalid = new BadRequestException('Invalid or expired code');
    if (!otp) throw invalid;

    const failures = await this.prisma.emailOtp.aggregate({
      where: { email, createdAt: { gt: new Date(Date.now() - HOUR_MS) } },
      _sum: { attempts: true },
    });
    if ((failures._sum.attempts ?? 0) >= MAX_FAILURES_PER_HOUR) throw invalid;

    // Claim the guess before comparing: concurrent guesses can't all slip
    // through on the same remaining attempt.
    const claimed = await this.prisma.emailOtp.updateMany({
      where: { id: otp.id, attempts: { lt: MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) throw invalid;

    const given = Buffer.from(this.hash(email, code), 'hex');
    const stored = Buffer.from(otp.codeHash, 'hex');
    if (given.length !== stored.length || !timingSafeEqual(given, stored)) throw invalid;
    // Single use: only the request that flips consumedAt wins a race.
    const { count } = await this.prisma.emailOtp.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (count !== 1) throw invalid;

    return { provider: 'EMAIL', providerSubject: email, email, emailVerified: true };
  }

  /** Drop every code for these addresses (account deletion). */
  async purge(emails: string[]): Promise<void> {
    if (!emails.length) return;
    await this.prisma.emailOtp.deleteMany({ where: { email: { in: emails } } });
  }

  private hash(email: string, code: string): string {
    return createHash('sha256').update(`${code}:${email}:${this.pepper}`).digest('hex');
  }
}
