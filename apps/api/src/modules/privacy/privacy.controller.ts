import { Body, Controller, Delete, Get, HttpCode, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { DeviceId } from '../../common/device/device-id.decorator';
import { DeviceDataService } from './device-data.service';
import { ProfileService } from './profile.service';

class ProfileMetaDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  placeName?: string;
}

@ApiTags('Privacy')
@ApiBearerAuth()
@Controller('me')
export class PrivacyController {
  constructor(
    private readonly data: DeviceDataService,
    private readonly profiles: ProfileService,
  ) {}

  @Delete('data')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete everything stored for this subject, its account, and revoke its installs' })
  async deleteMyData(@DeviceId() deviceId: string) {
    const deleted = await this.data.deleteAll(deviceId);
    return { deleted };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Saved birth profile + display fields (restores a new phone after sign-in)' })
  async profile(@DeviceId() deviceId: string) {
    return { profile: await this.profiles.get(deviceId) };
  }

  @Put('profile')
  @HttpCode(204)
  @ApiOperation({ summary: 'Save display name / birth place label alongside the chart' })
  async saveProfile(@DeviceId() deviceId: string, @Body() dto: ProfileMetaDto) {
    await this.profiles.saveMeta(deviceId, dto);
  }
}
