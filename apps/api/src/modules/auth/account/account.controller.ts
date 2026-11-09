import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthProvider } from '../../../../generated/prisma/client';
import { AuthRoute } from '../../../common/auth/route-tags';
import { DeviceId, InstallId } from '../../../common/device/device-id.decorator';
import { DeviceAuthService } from '../device-auth.service';
import { AppleVerifier } from '../providers/apple.verifier';
import { EmailOtpService } from '../providers/email-otp.service';
import { GoogleVerifier } from '../providers/google.verifier';
import {
  AppleSignInDto,
  EmailStartDto,
  EmailVerifyDto,
  GoogleSignInDto,
  PROVIDER_PARAMS,
  type ProviderParam,
} from './account.dto';
import { AccountService } from './account.service';

/**
 * Optional accounts. Every route needs the install's device token: a sign-in
 * proof always lands on the calling install (link its data, or switch it to
 * the account's data). Proof routes carry the strict per-IP auth limit.
 */
@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AccountController {
  constructor(
    private readonly accounts: AccountService,
    private readonly deviceAuth: DeviceAuthService,
    private readonly apple: AppleVerifier,
    private readonly google: GoogleVerifier,
    private readonly emailOtp: EmailOtpService,
  ) {}

  @AuthRoute()
  @Post('apple')
  @HttpCode(200)
  @ApiOperation({ summary: 'Link Sign in with Apple to this install, or sign in to its account' })
  async signInApple(@DeviceId() subjectId: string, @InstallId() installId: string, @Body() dto: AppleSignInDto) {
    const identity = await this.apple.verify({
      identityToken: dto.identityToken,
      rawNonce: dto.rawNonce,
      authorizationCode: dto.authorizationCode,
      displayName: dto.givenName,
    });
    return this.accounts.linkOrSignIn({ subjectId, installId }, identity);
  }

  @AuthRoute()
  @Post('google')
  @HttpCode(200)
  @ApiOperation({ summary: 'Link Google to this install, or sign in to its account' })
  async signInGoogle(@DeviceId() subjectId: string, @InstallId() installId: string, @Body() dto: GoogleSignInDto) {
    const identity = await this.google.verify(dto.idToken);
    return this.accounts.linkOrSignIn({ subjectId, installId }, identity);
  }

  @AuthRoute()
  @Post('email/start')
  @HttpCode(204)
  @ApiOperation({ summary: 'Email a 6-digit sign-in code' })
  async emailStart(@Body() dto: EmailStartDto) {
    await this.emailOtp.start(dto.email, dto.locale ?? 'en');
  }

  @AuthRoute()
  @Post('email/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check the code, then link email to this install or sign in to its account' })
  async emailVerify(@DeviceId() subjectId: string, @InstallId() installId: string, @Body() dto: EmailVerifyDto) {
    const identity = await this.emailOtp.verify(dto.email, dto.code);
    return this.accounts.linkOrSignIn({ subjectId, installId }, identity);
  }

  @Get('me')
  @ApiOperation({ summary: 'The account behind this install, if any' })
  async me(@DeviceId() subjectId: string) {
    return { account: await this.accounts.forSubject(subjectId) };
  }

  @Delete('identities/:provider')
  @ApiOperation({ summary: 'Remove one sign-in method (not the last)' })
  async unlink(@DeviceId() subjectId: string, @Param('provider') provider: string) {
    if (!PROVIDER_PARAMS.includes(provider as ProviderParam)) throw new BadRequestException('Unknown provider');
    return { account: await this.accounts.unlink(subjectId, provider.toUpperCase() as AuthProvider) };
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke this install; the app registers a fresh anonymous one' })
  async logout(@InstallId() installId: string) {
    await this.deviceAuth.revoke(installId);
  }
}
