import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DeviceAuthController } from './device-auth.controller';
import { DeviceAuthService } from './device-auth.service';

/** Anonymous device identity: token issuing, verification and revocation. */
@Global()
@Module({
  // Secrets are passed per call (device tokens use JWT_DEVICE_SECRET, not the user secret).
  imports: [JwtModule.register({})],
  controllers: [DeviceAuthController],
  providers: [DeviceAuthService],
  exports: [DeviceAuthService],
})
export class AuthModule {}
