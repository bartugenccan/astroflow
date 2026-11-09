import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface WaitlistSignup {
  email: string;
  locale: string;
  source?: string;
}

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent: a repeat sign-up is a no-op, so the response never reveals
   * whether an address was already on the list.
   */
  async join({ email, locale, source }: WaitlistSignup): Promise<void> {
    await this.prisma.waitlistEntry.upsert({
      where: { email: email.trim().toLowerCase() },
      create: { email: email.trim().toLowerCase(), locale, source: source ?? null },
      update: {},
    });
  }
}
