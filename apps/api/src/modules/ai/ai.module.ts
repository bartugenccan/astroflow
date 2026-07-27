import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { DeepSeekIntegrationService } from './deepseek-integration.service';
import { DeepSeekProvider } from './deepseek.provider';
import { AI_TEXT_PROVIDER } from './ai-text-provider';

@Module({
  controllers: [AIController],
  providers: [
    DeepSeekIntegrationService,
    // Active text-generation provider. Swap the class here to change vendors.
    { provide: AI_TEXT_PROVIDER, useClass: DeepSeekProvider },
  ],
  exports: [DeepSeekIntegrationService, AI_TEXT_PROVIDER],
})
export class AIModule {}
