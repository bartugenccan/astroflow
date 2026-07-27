import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { AstrologyModule } from '../astrology/astrology.module';
import { CompanionController } from './companion.controller';
import { CompanionService } from './companion.service';
import { MemoryService } from './memory.service';

@Module({
  imports: [AIModule, AstrologyModule],
  controllers: [CompanionController],
  providers: [CompanionService, MemoryService],
  exports: [MemoryService],
})
export class CompanionModule {}
