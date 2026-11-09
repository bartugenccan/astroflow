import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeepSeekProvider } from './deepseek.provider';
import { AnthropicProvider } from './anthropic.provider';
import { AI_TEXT_PROVIDER, AI_VENDOR, AiVendorName } from './ai-text-provider';
import { AiBudgetService } from './ai-budget.service';
import { DeepSeekBalanceService } from './deepseek-balance.service';
import { GuardedAiProvider } from './guarded-ai.provider';

@Module({
  providers: [
    DeepSeekProvider,
    AnthropicProvider,
    AiBudgetService,
    DeepSeekBalanceService,
    // Concrete vendor client, chosen by AI_PROVIDER (anthropic by default | deepseek).
    {
      provide: AI_VENDOR,
      inject: [ConfigService, DeepSeekProvider, AnthropicProvider],
      useFactory: (config: ConfigService, deepseek: DeepSeekProvider, anthropic: AnthropicProvider) =>
        config.get<AiVendorName>('AI_PROVIDER', 'anthropic') === 'deepseek' ? deepseek : anthropic,
    },
    // What services inject: the vendor behind the balance + daily budget guards.
    { provide: AI_TEXT_PROVIDER, useClass: GuardedAiProvider },
  ],
  exports: [AI_TEXT_PROVIDER, AiBudgetService, DeepSeekBalanceService],
})
export class AIModule {}
