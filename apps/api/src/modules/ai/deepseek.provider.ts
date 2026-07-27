import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiTextProvider,
  GenerateJsonParams,
  GenerateTextParams,
} from './ai-text-provider';

interface DeepSeekResponse {
  choices: { message: { content: string } }[];
}

/**
 * DeepSeek implementation of AiTextProvider. Real fetch to /chat/completions,
 * Bearer auth, 15s timeout, 3-attempt backoff. `available` is false when no key
 * is set, letting callers fall back to templated content in dev.
 */
@Injectable()
export class DeepSeekProvider implements AiTextProvider {
  private readonly logger = new Logger(DeepSeekProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  readonly model: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1');
    this.apiKey = config.get<string>('DEEPSEEK_API_KEY', '');
    // Override via DEEPSEEK_MODEL; default to the cheaper/faster tier.
    this.model = config.get<string>('DEEPSEEK_MODEL', 'deepseek-v4-flash');
  }

  get available(): boolean {
    return !!this.apiKey;
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    const { system, user, temperature = 0.7, maxTokens = 400 } = params;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
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
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
        }
        const data = (await res.json()) as DeepSeekResponse;
        return data.choices[0].message.content.trim();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(`DeepSeek attempt ${attempt}/3 failed: ${lastError.message}`);
        if (attempt < 3) await this.delay(attempt * 1000);
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new Error(`DeepSeek failed after 3 attempts: ${lastError?.message}`);
  }

  async generateJson<T>(params: GenerateJsonParams): Promise<T> {
    const user = params.schemaHint
      ? `${params.user}\n\nReturn ONLY valid JSON matching: ${params.schemaHint}`
      : params.user;
    const raw = await this.generateText({ ...params, user });
    return this.parseJson<T>(raw);
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
