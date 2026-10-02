import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { Public } from '../../common/auth/public.decorator';
import { AuthRoute } from '../../common/auth/route-tags';
import { DeviceAuthService } from './device-auth.service';

class RegisterDeviceDto {
  /** The id an existing install used before device tokens (one-time claim). */
  @IsOptional()
  @IsUUID()
  legacyDeviceId?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class DeviceAuthController {
  constructor(private readonly auth: DeviceAuthService) {}

  @Public()
  @AuthRoute()
  @Post('device')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register an anonymous device and get its signed device token' })
  register(@Body() dto: RegisterDeviceDto) {
    return this.auth.register(dto.legacyDeviceId);
  }
}
