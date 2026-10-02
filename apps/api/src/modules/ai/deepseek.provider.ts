import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiTextProvider,
  GenerateJsonParams,
  GenerateTextParams,
} from './ai-text-provider';
import { noteAiFailure } from '../../common/ai/ai-call-tracker';

interface DeepSeekResponse {
  choices: {
    message: { content: string; reasoning_content?: string };
    finish_reason?: string;
  }[];
}

/**
 * DeepSeek implementation of AiTextProvider. Real fetch to /chat/completions,
 * Bearer auth, length-scaled timeout, 3-attempt backoff. `available` is false
 * when no key is set, letting callers fall back to templated content in dev.
 */
/**
 * Ceiling on one generateText call including retries. Sits comfortably inside
 * the ~60s platform default the mobile client relies on.
 */
const TOTAL_BUDGET_MS = 50_000;

/** A non-2xx from DeepSeek. Carries only the status, never the response body. */
export class DeepSeekHttpError extends Error {
  constructor(readonly status: number) {
    super(`DeepSeek HTTP ${status}`);
    this.name = 'DeepSeekHttpError';
  }

  /** 429 (rate limit) and 5xx are transient; 400/401/402 (bad request, key, balance) are not. */
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

@Injectable()
export class DeepSeekProvider implements AiTextProvider {
  private readonly logger = new Logger(DeepSeekProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  readonly model: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1');
    this.apiKey = config.get<string>('DEEPSEEK_API_KEY', '');
    // Override via DEEPSEEK_MODEL; default to the cheaper/faster tier (the id
    // the /models endpoint lists — "deepseek-v4-flash" is only an alias).
    this.model = config.get<string>('DEEPSEEK_MODEL', 'deepseek-flash');
    this.thinking = config.get<string>('DEEPSEEK_THINKING', 'disabled') === 'enabled';
  }

  /**
   * Hidden reasoning is off by default. Every prompt here is a short, fully
   * specified writing task; with reasoning on, the model spent the whole
   * `max_tokens` budget thinking and returned empty `content`, so every call
   * burned three retries and the app sat on its loading state. Set
   * DEEPSEEK_THINKING=enabled only alongside much larger token budgets.
   */
  private readonly thinking: boolean;

  get available(): boolean {
    return !!this.apiKey;
  }

  /**
   * How long to wait for a completion. A flat timeout punishes exactly the
   * calls that need the most time: the long-form ones (monthly forecast, the
   * year-ahead reading) ask for thousands of tokens and cannot finish inside
   * the budget a 400-token daily insight needs. Scale with the requested
   * length, keeping the old 15s floor for short calls, and cap so a hung
   * connection still fails in reasonable time.
   */
  private timeoutFor(maxTokens: number): number {
    return Math.min(45_000, Math.max(15_000, maxTokens * 20));
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    const { system, user, temperature = 0.7, maxTokens = 400 } = params;
    let lastError: Error | null = null;
    // Mobile clients have no explicit fetch timeout, so they inherit the
    // platform's (~60s). Three long attempts back to back would outlast that
    // and the caller would see a network error instead of the stub fallback —
    // so bound the whole retry loop, not just each attempt.
    const deadline = Date.now() + TOTAL_BUDGET_MS;

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt > 1 && Date.now() >= deadline) {
        this.logger.warn('DeepSeek budget exhausted; giving up early');
        break;
      }
      const controller = new AbortController();
      // Never wait past the overall budget, however much this attempt is owed.
      const remaining = deadline - Date.now();
      const timeout = setTimeout(
        () => controller.abort(),
        Math.max(5_000, Math.min(this.timeoutFor(maxTokens), remaining)),
      );
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature,
            max_tokens: maxTokens,
            thinking: { type: this.thinking ? 'enabled' : 'disabled' },
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          // The body can echo our prompt (user text) — log the status only.
          await res.body?.cancel().catch(() => undefined);
          throw new DeepSeekHttpError(res.status);
        }
        const data = (await res.json()) as DeepSeekResponse;
        const choice = data.choices?.[0];
        const content = choice?.message?.content?.trim() ?? '';
        // Reasoning models spend the token budget on hidden reasoning first and
        // can come back with an empty `content` (finish_reason "length") even
        // on a 200. Returning "" here would surface downstream as an opaque
        // "Unexpected end of JSON input"; treat it as a retryable miss so the
        // remaining attempts — and ultimately the stub — take over cleanly.
        if (!content) {
          throw new Error(
            `DeepSeek returned empty content (finish_reason: ${choice?.finish_reason ?? 'unknown'})`,
          );
        }
        return content;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(`DeepSeek attempt ${attempt}/3 failed: ${lastError.message}`);
        // Auth, billing and bad-request errors won't heal on retry — don't pay for two more.
        if (err instanceof DeepSeekHttpError && !err.retryable) break;
        if (attempt < 3) await this.delay(attempt * 1000);
      } finally {
        clearTimeout(timeout);
      }
    }
    noteAiFailure();
    throw new Error(`DeepSeek failed: ${lastError?.message ?? 'unknown error'}`);
  }

  async generateJson<T>(params: GenerateJsonParams): Promise<T> {
    const user = params.schemaHint
      ? `${params.user}\n\nReturn ONLY valid JSON matching: ${params.schemaHint}`
      : params.user;
    const raw = await this.generateText({ ...params, user });
    try {
      return this.parseJson<T>(raw);
    } catch (err) {
      // Unparseable output means the caller will serve its stub — don't let it be cached.
      noteAiFailure();
      throw err;
    }
  }

  /** Tolerant JSON extraction — strips code fences and slices to the outer braces. */
  private parseJson<T>(raw: string): T {
    let s = raw.trim();
    s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      s = s.slice(start, end + 1);
    }
    return JSON.parse(s) as T;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
