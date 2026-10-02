import { Controller, Delete, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceId } from '../../common/device/device-id.decorator';
import { DeviceDataService } from './device-data.service';

@ApiTags('Privacy')
@ApiBearerAuth()
@Controller('me')
export class PrivacyController {
  constructor(private readonly data: DeviceDataService) {}

  @Delete('data')
  @HttpCode(200)
  @ApiOperation({ summary: "Delete everything stored for this device and revoke its token" })
  async deleteMyData(@DeviceId() deviceId: string) {
    const deleted = await this.data.deleteAll(deviceId);
    return { deleted };
  }
}
