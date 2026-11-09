import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DeviceAuthController } from './device-auth.controller';
import { DeviceAuthService } from './device-auth.service';
import { AccountController } from './account/account.controller';
import { AccountService } from './account/account.service';
import { SubjectMergeService } from './account/subject-merge.service';
import { AppleVerifier } from './providers/apple.verifier';
import { GoogleVerifier } from './providers/google.verifier';
import { EmailOtpService } from './providers/email-otp.service';
import { ResendMailer } from './providers/resend.mailer';

/**
 * Identity: anonymous installs (device tokens: issue, verify, revoke) and the
 * optional accounts on top of them (Apple / Google / email code).
 */
@Global()
@Module({
  // Secrets are passed per call (device tokens use JWT_DEVICE_SECRET).
  imports: [JwtModule.register({})],
  controllers: [DeviceAuthController, AccountController],
  providers: [
    DeviceAuthService,
    AccountService,
    SubjectMergeService,
    AppleVerifier,
    GoogleVerifier,
    EmailOtpService,
    ResendMailer,
  ],
  exports: [DeviceAuthService, AccountService],
})
export class AuthModule {}
