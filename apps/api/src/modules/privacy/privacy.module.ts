import { Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { DeviceDataService } from './device-data.service';

@Module({
  controllers: [PrivacyController],
  providers: [DeviceDataService],
})
export class PrivacyModule {}
