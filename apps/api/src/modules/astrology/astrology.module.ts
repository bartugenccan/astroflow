import { Module } from '@nestjs/common';
import { AstrologyController } from './astrology.controller';
import { AstrologyService } from './astrology.service';
import { AstrologyEngine } from './astrology-engine.service';
import { AIInsightEngine } from './ai-insight-engine.service';
import { AstrologyAdapterService } from './astrology-adapter.service';
import { EphemerisService } from './ephemeris.service';
import { InterpretationService } from './interpretation.service';
import { SynastryService } from './synastry.service';
import { SolarReturnService } from './solar-return.service';
import { AIModule } from '../ai/ai.module';
import { DeviceEntitlementService } from '../../common/device/device-entitlement.service';

@Module({
  imports: [AIModule],
  controllers: [AstrologyController],
  providers: [
    AstrologyService,
    AstrologyEngine,
    AIInsightEngine,
    AstrologyAdapterService,
    EphemerisService,
    InterpretationService,
    SynastryService,
    SolarReturnService,
    DeviceEntitlementService,
  ],
  exports: [
    AstrologyService,
    AstrologyEngine,
    AIInsightEngine,
    AstrologyAdapterService,
    EphemerisService,
    InterpretationService,
    SynastryService,
    SolarReturnService,
    DeviceEntitlementService,
  ],
})
export class AstrologyModule {}
