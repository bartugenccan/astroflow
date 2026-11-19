import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_VENDOR, AiTextProvider, AiVendorName, GenerateJsonParams, GenerateTextParams } from './ai-text-provider';
import { AiBudgetService } from './ai-budget.service';
import { DeepSeekBalanceService } from './deepseek-balance.service';
import { currentDeviceId, currentFeature } from '../../common/context/request-context';
import { noteAiFailure } from '../../common/ai/ai-call-tracker';
import { AnalyticsService } from '../../common/analytics/analytics.service';

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
 *
 * Every vendor call is also reported to PostHog as an `$ai_generation`
 * (provider, model, feature, latency, success; never the prompt or answer).
 */
@Injectable()
export class GuardedAiProvider implements AiTextProvider {
  private readonly provider: AiVendorName;

  constructor(
    @Inject(AI_VENDOR) private readonly inner: AiTextProvider,
    private readonly budget: AiBudgetService,
    private readonly balance: DeepSeekBalanceService,
    private readonly analytics: AnalyticsService,
    config: ConfigService,
  ) {
    this.provider = config.get<AiVendorName>('AI_PROVIDER', 'anthropic') === 'deepseek' ? 'deepseek' : 'anthropic';
  }

  get available(): boolean {
    return this.inner.available;
  }

  get model(): string {
    return this.inner.model;
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    await this.admit();
    return this.measured(params, () => this.inner.generateText(params), (out) => out.length);
  }

  async generateJson<T>(params: GenerateJsonParams): Promise<T> {
    await this.admit();
    return this.measured(params, () => this.inner.generateJson<T>(params), (out) => JSON.stringify(out ?? null).length);
  }

  private async measured<T>(params: GenerateTextParams, call: () => Promise<T>, size: (out: T) => number): Promise<T> {
    const started = Date.now();
    const base = {
      provider: this.provider,
      model: this.inner.model,
      feature: currentFeature(),
      inputChars: params.system.length + params.user.length,
    };
    try {
      const out = await call();
      this.analytics.captureAiGeneration(currentDeviceId(), {
        ...base,
        latencyMs: Date.now() - started,
        ok: true,
        outputChars: size(out),
      });
      return out;
    } catch (err) {
      this.analytics.captureAiGeneration(currentDeviceId(), {
        ...base,
        latencyMs: Date.now() - started,
        ok: false,
        errorType: err instanceof Error ? err.name : 'unknown',
      });
      throw err;
    }
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
