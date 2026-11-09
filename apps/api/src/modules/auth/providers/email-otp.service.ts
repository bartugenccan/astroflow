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

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const SEND_WINDOW_MS = 15 * 60_000;
const MAX_SENDS_PER_WINDOW = 3;
const MAX_SENDS_PER_DAY = 10;
/** Wrong guesses across all of an address's codes before it is locked for the hour. */
const MAX_FAILURES_PER_HOUR = 10;
const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Passwordless email sign-in with a 6-digit code. Codes are stored hashed
 * (bound to the address and a server secret), expire after 10 minutes, allow
 * five guesses, and an address gets at most three codes per 15 minutes and
 * ten per day — on top of the per-IP @AuthRoute limit. Guesses are counted
 * across codes too, so requesting fresh codes doesn't reset the guess budget.
 */
@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);
  private readonly pepper: string;
  private readonly devLog: boolean;

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
    const [recent, today] = await Promise.all([
      this.prisma.emailOtp.count({ where: { email, createdAt: { gt: new Date(now - SEND_WINDOW_MS) } } }),
      this.prisma.emailOtp.count({ where: { email } }),
    ]);
    if (recent >= MAX_SENDS_PER_WINDOW || today >= MAX_SENDS_PER_DAY) {
      throw new HttpException('Too many codes requested. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.emailOtp.create({
      data: { email, codeHash: this.hash(email, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });

    if (this.mailer.configured) {
      const sent = await this.mailer.sendSignInCode(email, code, locale);
      if (!sent && !this.devLog) throw new ServiceUnavailableException('Could not send the code');
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
