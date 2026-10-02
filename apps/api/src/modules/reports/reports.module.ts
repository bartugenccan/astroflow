import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { AstrologyModule } from '../astrology/astrology.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [AIModule, AstrologyModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
