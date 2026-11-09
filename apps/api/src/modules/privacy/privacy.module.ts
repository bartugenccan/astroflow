import { Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { DeviceDataService } from './device-data.service';
import { ProfileService } from './profile.service';

@Module({
  controllers: [PrivacyController],
  providers: [DeviceDataService, ProfileService],
})
export class PrivacyModule {}
