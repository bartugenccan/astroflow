import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import Anthropic from '@anthropic-ai/sdk';
import {
  AiTextProvider,
  GenerateJsonParams,
  GenerateTextParams,
} from './ai-text-provider';
import { noteAiFailure } from '../../common/ai/ai-call-tracker';
import { parseModelJson, withSchemaHint } from './ai-json';

/**
 * Ceiling on one generateText call including the SDK's retries. Sits inside
 * the ~60s platform default the mobile client relies on (same as DeepSeek).
 */
const TOTAL_BUDGET_MS = 50_000;

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/**
 * Models that take `output_config.effort` and the server-side refusal
 * fallback. Haiku 4.5 takes neither, but still accepts `temperature`.
 */
const EFFORT_MODELS = /^claude-(opus-5|sonnet-5-5|fable-5)/;

/**
 * Thinking runs inside `max_tokens` on the effort models, so callers' small
 * budgets (a 400-token daily insight) get headroom on top for the reasoning.
 */
const THINKING_HEADROOM = 2_048;

/**
 * Claude implementation of AiTextProvider via the official SDK. The SDK owns
 * the retry loop (408/409/429/5xx + connection errors, backoff); an overall
 * abort signal bounds it to TOTAL_BUDGET_MS. `available` is false when no key
 * is set, letting callers fall back to templated content in dev.
 */
@Injectable()
export class AnthropicProvider implements AiTextProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic | null;
  private readonly effort: Effort;
  readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY', '');
    this.model = config.get<string>('ANTHROPIC_MODEL', 'claude-opus-5-5');
    // Every prompt here is a short, fully specified writing task — low effort
    // keeps latency and spend down; raise via ANTHROPIC_EFFORT if quality needs it.
    this.effort = config.get<Effort>('ANTHROPIC_EFFORT', 'low');
    this.client = apiKey ? new Anthropic({ apiKey, maxRetries: 2 }) : null;
  }

  get available(): boolean {
    return this.client !== null;
  }

  /** Per-attempt timeout, scaled with requested length like the DeepSeek client. */
  private timeoutFor(maxTokens: number): number {
    return Math.min(45_000, Math.max(15_000, maxTokens * 20));
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    const { system, user, temperature = 0.7, maxTokens = 400 } = params;
    if (!this.client) {
      noteAiFailure();
      throw new Error('Anthropic provider is not configured');
    }
    const effortModel = EFFORT_MODELS.test(this.model);

    try {
      const response = await this.client.beta.messages.create(
        {
          model: this.model,
          max_tokens: effortModel ? maxTokens + THINKING_HEADROOM : maxTokens,
          system,
          messages: [{ role: 'user', content: user }],
          ...(effortModel
            ? {
                output_config: { effort: this.effort },
                // A safety decline is retried server-side on Anthropic's
                // recommended model for that category instead of failing.
                betas: ['server-side-fallback-2026-07-01'],
                fallbacks: 'default',
              }
            : { temperature }),
        },
        {
          timeout: this.timeoutFor(maxTokens),
          signal: AbortSignal.timeout(TOTAL_BUDGET_MS),
        },
      );

      if (response.stop_reason === 'refusal') {
        throw new Error(`Claude declined (category: ${response.stop_details?.category ?? 'unknown'})`);
      }
      const content = response.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('')
        .trim();
      if (!content) {
        throw new Error(`Claude returned empty content (stop_reason: ${response.stop_reason ?? 'unknown'})`);
      }
      return content;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // API errors can echo our prompt (user text) — log the status/class only.
      const label =
        err instanceof Anthropic.APIError ? `HTTP ${err.status ?? 'n/a'} ${error.name}` : error.message;
      this.logger.warn(`Claude call failed: ${label}`);
      noteAiFailure();
      // Users still get templated text; this surfaces provider outages. The message is
      // fixed (grouping) and carries no prompt or response content.
      Sentry.captureMessage('Claude failed after retries — served fallback text', {
        level: 'warning',
        tags: { ai_provider: 'anthropic', ai_error: error.name },
      });
      throw new Error(`Claude failed: ${label}`);
    }
  }

  async generateJson<T>(params: GenerateJsonParams): Promise<T> {
    const user = withSchemaHint(params.user, params.schemaHint);
    const raw = await this.generateText({ ...params, user });
    try {
      return parseModelJson<T>(raw);
    } catch (err) {
      // Unparseable output means the caller will serve its stub — don't let it be cached.
      noteAiFailure();
      throw err;
    }
  }
}
