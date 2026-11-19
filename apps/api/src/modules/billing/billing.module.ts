import { Module } from '@nestjs/common';
import { AstrologyModule } from '../astrology/astrology.module';
import { MascotModule } from '../mascot/mascot.module';
import { FreeTierService } from './free-tier.service';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

/** RevenueCat subscriptions: /billing/sync and the webhook (DeviceEntitlementService comes from AstrologyModule). */
@Module({
  imports: [AstrologyModule, MascotModule],
  controllers: [BillingController],
  providers: [BillingService, FreeTierService],
  exports: [BillingService, FreeTierService],
})
export class BillingModule {}
