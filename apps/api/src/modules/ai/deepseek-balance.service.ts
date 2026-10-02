import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { safeError } from '../../common/logging/safe-error';

/** How long a balance reading is trusted. */
const TTL_MS = 5 * 60_000;

interface BalanceResponse {
  is_available?: boolean;
  balance_infos?: { currency: string; total_balance: string }[];
}

/**
 * Watches the prepaid DeepSeek balance. Below `DEEPSEEK_MIN_BALANCE` new AI
 * generation pauses (callers serve templated text, which is never cached), so
 * an empty balance degrades gracefully instead of producing a stream of
 * failed, retried calls. The amount itself is only ever logged server-side.
 */
@Injectable()
export class DeepSeekBalanceService {
  private readonly logger = new Logger(DeepSeekBalanceService.name);
  private readonly url: string;
  private readonly apiKey: string;
  private readonly min: number;
  private cached: { ok: boolean; at: number } | null = null;
  private inflight: Promise<boolean> | null = null;

  constructor(config: ConfigService) {
    // The balance endpoint lives at the API root, not under /v1.
    const base = config.get<string>('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1');
    this.url = `${base.replace(/\/v\d+\/?$/, '').replace(/\/$/, '')}/user/balance`;
    this.apiKey = config.get<string>('DEEPSEEK_API_KEY', '');
    this.min = config.get<number>('DEEPSEEK_MIN_BALANCE') ?? 0.2;
  }

  /** True when there is enough balance to generate. Fails open if the balance can't be read. */
  async hasBalance(): Promise<boolean> {
    if (!this.apiKey) return false;
    if (this.cached && Date.now() - this.cached.at < TTL_MS) return this.cached.ok;
    this.inflight ??= this.fetchBalance().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async fetchBalance(): Promise<boolean> {
    try {
      const res = await fetch(this.url, {
        headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) throw new Error(`balance HTTP ${res.status}`);
      const body = (await res.json()) as BalanceResponse;
      const total = Number(body.balance_infos?.[0]?.total_balance ?? NaN);
      const ok = body.is_available !== false && !(Number.isFinite(total) && total < this.min);
      if (!ok) {
        this.logger.warn(
          `DeepSeek balance low (${Number.isFinite(total) ? total : '?'} < ${this.min}) — AI generation paused`,
        );
      }
      this.cached = { ok, at: Date.now() };
      return ok;
    } catch (err) {
      this.logger.warn(`DeepSeek balance check failed (allowing calls): ${safeError(err)}`);
      // Don't hammer the endpoint while it's failing; retry after a short pause.
      this.cached = { ok: true, at: Date.now() - TTL_MS + 30_000 };
      return true;
    }
  }
}
