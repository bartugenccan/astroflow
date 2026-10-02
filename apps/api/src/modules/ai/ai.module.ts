import { Module } from '@nestjs/common';
import { DeepSeekProvider } from './deepseek.provider';
import { AI_TEXT_PROVIDER } from './ai-text-provider';
import { AiBudgetService } from './ai-budget.service';
import { DeepSeekBalanceService } from './deepseek-balance.service';
import { GuardedAiProvider } from './guarded-ai.provider';

@Module({
  providers: [
    // Concrete vendor client. Swap this (and the GuardedAiProvider's inner) to change vendors.
    DeepSeekProvider,
    AiBudgetService,
    DeepSeekBalanceService,
    // What services inject: the vendor behind the balance + daily budget guards.
    { provide: AI_TEXT_PROVIDER, useClass: GuardedAiProvider },
  ],
  exports: [AI_TEXT_PROVIDER, AiBudgetService, DeepSeekBalanceService],
})
export class AIModule {}
