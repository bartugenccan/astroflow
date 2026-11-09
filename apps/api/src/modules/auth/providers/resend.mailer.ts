import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type Locale = 'en' | 'tr';

const COPY: Record<Locale, { subject: string; intro: string; expiry: string; ignore: string }> = {
  en: {
    subject: 'Your AstroFlow sign-in code',
    intro: 'Your sign-in code is:',
    expiry: 'It expires in 10 minutes.',
    ignore: "If you didn't ask for this, you can ignore this email.",
  },
  tr: {
    subject: 'AstroFlow giriş kodun',
    intro: 'Giriş kodun:',
    expiry: '10 dakika içinde geçerliliğini yitirir.',
    ignore: 'Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.',
  },
};

/**
 * Transactional email through Resend's REST API (no SDK). Only the sign-in
 * code goes out; the address is used for nothing else.
 */
@Injectable()
export class ResendMailer {
  private readonly logger = new Logger(ResendMailer.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('RESEND_API_KEY') ?? '';
    this.from = config.get<string>('AUTH_EMAIL_FROM') ?? '';
  }

  get configured(): boolean {
    return Boolean(this.apiKey && this.from);
  }

  /** Resolves true when Resend accepted the message. */
  async sendSignInCode(to: string, code: string, locale: Locale): Promise<boolean> {
    const c = COPY[locale];
    const text = `${c.intro} ${code}\n\n${c.expiry}\n${c.ignore}`;
    const html =
      `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#181129;max-width:420px">` +
      `<p>${c.intro}</p>` +
      `<p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:16px 0">${code}</p>` +
      `<p style="color:#555">${c.expiry}<br>${c.ignore}</p></div>`;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.from, to: [to], subject: c.subject, text, html }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) this.logger.warn(`Resend rejected sign-in email: HTTP ${res.status}`);
      return res.ok;
    } catch {
      this.logger.warn('Resend unreachable — sign-in email not sent');
      return false;
    }
  }
}
