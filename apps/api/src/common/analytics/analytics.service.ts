import { createHash } from 'crypto';
import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

/** What one AI call cost us, without anything the user wrote or the model said. */
export interface AiGenerationEvent {
  provider: string;
  model: string;
  /** The feature (controller) that asked: "tarot", "companion", "astrology"… */
  feature?: string;
  latencyMs: number;
  ok: boolean;
  /** Error class only (never the message — vendor errors can echo the prompt). */
  errorType?: string;
  /** Length in characters of the prompt and the answer, as a rough size signal. */
  inputChars: number;
  outputChars?: number;
}

/**
 * Server-side PostHog. Off unless POSTHOG_API_KEY is set.
 *
 * Privacy: events carry no prompt, completion, birth data or free text. The
 * distinct id is a one-way hash of the device id, and person profiles are
 * not created (`$process_person_profile: false`), so an event can't be tied
 * back to a person in PostHog. This matches the "not linked" Diagnostics /
 * Usage Data entry in ship.config.json.
 */
@Injectable()
export class AnalyticsService implements OnApplicationShutdown {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly client: PostHog | null;

  constructor(config: ConfigService) {
    const key = (config.get<string>('POSTHOG_API_KEY') ?? '').trim();
    const host = (config.get<string>('POSTHOG_HOST') ?? '').trim() || 'https://eu.i.posthog.com';
    this.client = key ? new PostHog(key, { host, flushAt: 20, flushInterval: 10_000 }) : null;
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  /** PostHog LLM-analytics event (`$ai_generation`), metadata only. */
  captureAiGeneration(deviceId: string | undefined, e: AiGenerationEvent): void {
    if (!this.client) return;
    try {
      this.client.capture({
        distinctId: deviceId ? anonymousId(deviceId) : 'server',
        event: '$ai_generation',
        properties: {
          $process_person_profile: false,
          $ai_provider: e.provider,
          $ai_model: e.model,
          $ai_latency: e.latencyMs / 1000,
          $ai_is_error: !e.ok,
          ...(e.errorType ? { $ai_error: e.errorType } : {}),
          feature: e.feature ?? 'unknown',
          input_chars: e.inputChars,
          ...(e.outputChars !== undefined ? { output_chars: e.outputChars } : {}),
        },
      });
    } catch (err) {
      this.logger.warn(`PostHog capture failed: ${err instanceof Error ? err.name : 'unknown'}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client?.shutdown().catch(() => undefined);
  }
}

/** Stable, non-reversible id for a device (same device → same id, no way back). */
export function anonymousId(deviceId: string): string {
  return createHash('sha256').update(`astroflow:${deviceId}`).digest('hex').slice(0, 32);
}
