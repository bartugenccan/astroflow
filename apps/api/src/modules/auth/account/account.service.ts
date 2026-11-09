import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthProvider } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { DeviceAuthService, type DevicePrincipal } from '../device-auth.service';
import { AppleVerifier } from '../providers/apple.verifier';
import { EmailOtpService } from '../providers/email-otp.service';
import type { VerifiedIdentity } from '../providers/verified-identity';
import { SubjectMergeService } from './subject-merge.service';

/** What the app sees about the account behind its subject. */
export interface AccountView {
  id: string;
  providers: Lowercase<AuthProvider>[];
  email: string | null;
  displayName: string | null;
}

export interface LinkResult {
  account: AccountView;
  /** New device token when the install switched to the account's subject (sign-in). */
  token: string | null;
  /** true = signed in to an existing account; false = linked to this install's data. */
  signedIn: boolean;
}

const lower = (p: AuthProvider) => p.toLowerCase() as Lowercase<AuthProvider>;

/**
 * Optional accounts on top of anonymous subjects.
 *
 * - A proof for an identity nobody has → it is attached to the account that
 *   owns the caller's subject (created on first link). Data stays put.
 * - A proof for an identity that already belongs to an account → sign-in:
 *   the caller's anonymous data merges into the account, and the install gets
 *   a token for the account's subject.
 * - An install already on account A presenting B's identity → 409; the app
 *   signs out first. Accounts are never merged, and never matched by email.
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deviceAuth: DeviceAuthService,
    private readonly merge: SubjectMergeService,
    private readonly apple: AppleVerifier,
    private readonly emailOtp: EmailOtpService,
  ) {}

  async linkOrSignIn(principal: DevicePrincipal, id: VerifiedIdentity): Promise<LinkResult> {
    const existing = await this.prisma.authIdentity.findUnique({
      where: { provider_providerSubject: { provider: id.provider, providerSubject: id.providerSubject } },
      include: { account: true },
    });
    const current = await this.prisma.account.findUnique({ where: { subjectId: principal.subjectId } });

    if (existing) {
      if (id.appleRefreshTokenEnc) {
        await this.prisma.authIdentity.update({
          where: { id: existing.id },
          data: { appleRefreshTokenEnc: id.appleRefreshTokenEnc },
        });
      }
      if (existing.account.subjectId === principal.subjectId) {
        return { account: await this.view(existing.accountId), token: null, signedIn: false };
      }
      if (current) {
        throw new ConflictException({
          code: 'ACCOUNT_CONFLICT',
          message: 'This install is signed in to another account. Sign out first.',
        });
      }
      await this.merge.merge(principal.subjectId, existing.account.subjectId);
      const token = await this.deviceAuth.issueFor(principal.installId, existing.account.subjectId);
      return { account: await this.view(existing.accountId), token, signedIn: true };
    }

    const account =
      current ??
      (await this.prisma.account.create({
        data: { subjectId: principal.subjectId, displayName: id.displayName?.slice(0, 60) || null },
      }));
    try {
      await this.prisma.authIdentity.create({
        data: {
          accountId: account.id,
          provider: id.provider,
          providerSubject: id.providerSubject,
          email: id.email,
          emailVerified: id.emailVerified,
          appleRefreshTokenEnc: id.appleRefreshTokenEnc ?? null,
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        // Either a second identity of the same provider, or a concurrent link of the same one.
        throw new ConflictException({
          code: 'PROVIDER_ALREADY_LINKED',
          message: 'A sign-in of this type is already linked to the account.',
        });
      }
      throw err;
    }
    return { account: await this.view(account.id), token: null, signedIn: false };
  }

  async forSubject(subjectId: string): Promise<AccountView | null> {
    const account = await this.prisma.account.findUnique({ where: { subjectId }, select: { id: true } });
    return account ? this.view(account.id) : null;
  }

  /** Remove one sign-in method; the last one can't go (that's account deletion). */
  async unlink(subjectId: string, provider: AuthProvider): Promise<AccountView> {
    const account = await this.prisma.account.findUnique({
      where: { subjectId },
      include: { identities: true },
    });
    const identity = account?.identities.find((i) => i.provider === provider);
    if (!account || !identity) throw new NotFoundException('Not linked');
    if (account.identities.length < 2) {
      throw new BadRequestException({ code: 'LAST_IDENTITY', message: 'Keep at least one way to sign in.' });
    }
    await this.apple.revoke(identity.appleRefreshTokenEnc);
    await this.prisma.authIdentity.delete({ where: { id: identity.id } });
    return this.view(account.id);
  }

  /** Account part of "delete my data": revoke Apple tokens, drop account + identities + codes. */
  async deleteForSubject(subjectId: string): Promise<boolean> {
    const account = await this.prisma.account.findUnique({
      where: { subjectId },
      include: { identities: true },
    });
    if (!account) return false;
    for (const identity of account.identities) await this.apple.revoke(identity.appleRefreshTokenEnc);
    await this.emailOtp.purge(account.identities.flatMap((i) => (i.email ? [i.email] : [])));
    await this.prisma.account.delete({ where: { id: account.id } });
    return true;
  }

  private async view(accountId: string): Promise<AccountView> {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      include: { identities: { orderBy: { createdAt: 'asc' } } },
    });
    return {
      id: account.id,
      providers: account.identities.map((i) => lower(i.provider)),
      email: account.identities.find((i) => i.email)?.email ?? null,
      displayName: account.displayName,
    };
  }
}
