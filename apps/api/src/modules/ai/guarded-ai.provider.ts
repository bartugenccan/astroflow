import { Inject, Injectable } from '@nestjs/common';
import { AI_VENDOR, AiTextProvider, GenerateJsonParams, GenerateTextParams } from './ai-text-provider';
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
 * reaches the vendor it checks the prepaid balance (DeepSeek only — Claude is
 * billed against the Console's spend limits) and charges the daily budget
 * for the current device. A refused call throws like any AI failure, so the
 * caller serves its stub — and `noteAiFailure` keeps that stub out of caches.
 */
@Injectable()
export class GuardedAiProvider implements AiTextProvider {
  constructor(
    @Inject(AI_VENDOR) private readonly inner: AiTextProvider,
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
