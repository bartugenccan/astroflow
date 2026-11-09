import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Public } from '../../common/auth/public.decorator';
import { AuthRoute } from '../../common/auth/route-tags';
import { WaitlistService } from './waitlist.service';

class JoinWaitlistDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsIn(['tr', 'en'])
  locale: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;
}

@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  /** Called from the marketing site: no device token, strict per-IP limit. */
  @Public()
  @AuthRoute()
  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Join the pre-launch waitlist' })
  async join(@Body() dto: JoinWaitlistDto) {
    await this.waitlist.join(dto);
    return { ok: true };
  }
}
