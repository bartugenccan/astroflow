import { Injectable } from '@nestjs/common';
import { AiTextProvider, GenerateJsonParams, GenerateTextParams } from './ai-text-provider';
import { DeepSeekProvider } from './deepseek.provider';
import { AiBudgetService } from './ai-budget.service';
import { DeepSeekBalanceService } from './deepseek-balance.service';
import { currentDeviceId } from '../../common/context/request-context';
import { noteAiFailure } from '../../common/ai/ai-call-tracker';

export class AiPaused extends Error {
  constructor() {
    super('AI generation paused (low provider balance)');
    this.name = 'AiPaused';
  }
}

/**
 * The provider every service talks to (`AI_TEXT_PROVIDER`). Before a call
 * reaches DeepSeek it checks the prepaid balance and charges the daily budget
 * for the current device. A refused call throws like any AI failure, so the
 * caller serves its stub — and `noteAiFailure` keeps that stub out of caches.
 */
@Injectable()
export class GuardedAiProvider implements AiTextProvider {
  constructor(
    private readonly inner: DeepSeekProvider,
    private readonly budget: AiBudgetService,
    private readonly balance: DeepSeekBalanceService,
  ) {}

  get available(): boolean {
    return this.inner.available;
  }

  get model(): string {
    return this.inner.model;
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    await this.admit();
    return this.inner.generateText(params);
  }

  async generateJson<T>(params: GenerateJsonParams): Promise<T> {
    await this.admit();
    return this.inner.generateJson<T>(params);
  }

  private async admit(): Promise<void> {
    try {
      if (!(await this.balance.hasBalance())) throw new AiPaused();
      await this.budget.consume(currentDeviceId());
    } catch (err) {
      noteAiFailure();
      throw err;
    }
  }
}
