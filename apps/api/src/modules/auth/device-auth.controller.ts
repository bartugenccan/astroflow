import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/public.decorator';
import { AuthRoute } from '../../common/auth/route-tags';
import { DeviceAuthService } from './device-auth.service';

@ApiTags('Auth')
@Controller('auth')
export class DeviceAuthController {
  constructor(private readonly auth: DeviceAuthService) {}

  @Public()
  @AuthRoute()
  @Post('device')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register an anonymous device and get its signed device token' })
  register() {
    return this.auth.register();
  }
}
