'use client';

import { type FormEvent, useState } from 'react';
import type { Dict, Locale } from '@/i18n';
import { site } from '@/lib/site';

type Status = 'idle' | 'sending' | 'ok' | 'error' | 'invalid';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Posts to the API's public waitlist route. Until NEXT_PUBLIC_API_URL is set
 * (the API isn't deployed yet) it opens a pre-filled email instead, so a
 * sign-up is never silently lost.
 */
export function WaitlistForm({ t, locale }: { t: Dict['waitlist']; locale: Locale }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setStatus('invalid');
      return;
    }
    if (!site.apiUrl) {
      const subject = encodeURIComponent(t.mailtoSubject);
      const body = encodeURIComponent(`${value} (${locale})`);
      window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch(`${site.apiUrl}/api/v1/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, locale, source: 'landing' }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('ok');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  const message =
    status === 'ok' ? t.success : status === 'error' ? t.error : status === 'invalid' ? t.invalid : '';

  return (
    <>
      <form className="waitlist-form" onSubmit={onSubmit} noValidate>
        <label htmlFor="waitlist-email" className="sr-only">
          {t.label}
        </label>
        <input
          id="waitlist-email"
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.placeholder}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== 'sending') setStatus('idle');
          }}
          aria-invalid={status === 'invalid'}
          aria-describedby="waitlist-status"
          required
        />
        <button type="submit" className="btn" disabled={status === 'sending'}>
          {status === 'sending' ? t.sending : t.submit}
        </button>
      </form>
      <p
        id="waitlist-status"
        className={`form-status ${status === 'ok' ? 'ok' : 'err'}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
      <p className="consent">{t.consent}</p>
    </>
  );
}
