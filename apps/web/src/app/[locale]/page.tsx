import { Fragment, type CSSProperties } from 'react';
import { getDict, isLocale, type Locale } from '@/i18n';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PhoneMock } from '@/components/PhoneMock';
import { ZodiacWheel } from '@/components/ZodiacWheel';
import { WaitlistForm } from '@/components/WaitlistForm';
import { Aster } from '@/components/Aster';
import { Starfield } from '@/components/Starfield';
import { CheckIcon, FeatureIcon, ShieldIcon } from '@/components/Icons';
import { site } from '@/lib/site';
import type { ToneName } from '@/lib/tokens';

/** Feature cards walk through the candy tones, like the app's quest chips. */
const TONES: ToneName[] = ['primary', 'candy', 'star', 'mint', 'sky'];

/** Stagger index for CSS (`--i`). */
function i(n: number): CSSProperties {
  return { '--i': n } as CSSProperties;
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const t = getDict(locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'AstroFlow',
    operatingSystem: 'iOS, Android',
    applicationCategory: 'LifestyleApplication',
    description: t.meta.description,
    url: `${site.url}/${locale}/`,
    inLanguage: ['tr', 'en'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  const primaryCta = site.appStoreUrl ? (
    <a href="/get/?c=site_hero" className="btn btn-lg">
      {t.hero.primaryStore}
    </a>
  ) : (
    <a href="#waitlist" className="btn btn-lg">
      {t.hero.primary}
    </a>
  );

  return (
    <>
      <Header locale={locale} />
      <main id="main">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="hero">
          <Starfield seed="hero" count={90} shooting={3} />
          <div className="nebula nebula-a" data-loop aria-hidden="true" />
          <div className="nebula nebula-b" data-loop aria-hidden="true" />
          <ZodiacWheel className="hero-wheel" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow-chip hero-pop" style={i(0)}>
                <span className="pulse-dot" aria-hidden="true" />
                {t.hero.eyebrow}
              </span>
              <h1 className="display hero-title">
                {t.hero.title.split(' ').map((word, n) => (
                  <Fragment key={n}>
                    {n > 0 ? ' ' : null}
                    <span className="word" style={{ '--w': n } as CSSProperties}>
                      {word}
                    </span>
                  </Fragment>
                ))}
              </h1>
              <p className="lead hero-pop" style={i(3)}>
                {t.hero.tagline}
              </p>
              <div className="hero-ctas hero-pop" style={i(4)}>
                {primaryCta}
                <a href="#features" className="btn btn-lg btn-ghost">
                  {t.hero.secondary}
                </a>
              </div>
              <p className="hero-note hero-pop" style={i(5)}>
                {site.appStoreUrl ? t.hero.noteLive : t.hero.note}
              </p>
            </div>
            <div className="hero-visual">
              <div className="hero-aster parallax" data-loop>
                <Aster id="hero-aster" stage={5} size="100%" mood="glowing" />
              </div>
              <div className="parallax-slow">
                <PhoneMock t={t.phone} />
              </div>
            </div>
          </div>
          <a href="#grow" className="scroll-cue" aria-label={t.grow.eyebrow}>
            <span />
          </a>
        </section>

        {/* ── Trust marquee ────────────────────────────────── */}
        <div className="marquee" data-loop>
          <ul className="marquee-track">
            {[...t.trust, ...t.trust].map((item, n) => (
              <li key={n} aria-hidden={n >= t.trust.length ? true : undefined} className={`chip tone-${TONES[n % TONES.length]}`}>
                <CheckIcon />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Aster grows ──────────────────────────────────── */}
        <section id="grow" className="section grow">
          <Starfield seed="grow" count={40} />
          <div className="container">
            <div className="section-head center" data-reveal>
              <span className="eyebrow">{t.grow.eyebrow}</span>
              <h2 className="display">{t.grow.title}</h2>
              <p className="lead">{t.grow.body}</p>
            </div>
            <ol className="journey" data-reveal data-loop>
              <span className="journey-track" aria-hidden="true">
                <span className="journey-fill" />
              </span>
              {t.grow.stages.map((name, n) => (
                <li key={name} className="journey-stage" style={i(n)}>
                  <div className="journey-aster">
                    <Aster id={`grow-${n}`} stage={n} size="100%" mood={n === 5 ? 'glowing' : 'happy'} />
                  </div>
                  <span className="journey-num">{n + 1}</span>
                  <strong>{name}</strong>
                </li>
              ))}
            </ol>
            <div className="grow-points">
              {t.grow.points.map((p, n) => (
                <article key={p.title} className={`card tilt tone-card tone-${TONES[(n + 1) % TONES.length]}`} data-reveal style={i(n)}>
                  <span className="grow-badge">{n + 1}</span>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section id="features" className="section">
          <div className="container">
            <div className="section-head" data-reveal>
              <span className="eyebrow">{t.features.eyebrow}</span>
              <h2 className="display">{t.features.title}</h2>
              <p className="lead">{t.features.body}</p>
            </div>
            <div className="feature-grid">
              {t.features.items.map((f, n) => (
                <article
                  key={f.title}
                  className={`card feature tilt tone-card tone-${TONES[n % TONES.length]}`}
                  data-reveal
                  style={i(n % 3)}
                >
                  <div className="feature-icon">
                    <FeatureIcon name={f.icon} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────── */}
        <section className="section" aria-labelledby="how-title">
          <div className="container">
            <div className="section-head center" data-reveal>
              <span className="eyebrow">{t.how.eyebrow}</span>
              <h2 id="how-title" className="display">
                {t.how.title}
              </h2>
            </div>
            <ol className="steps" data-reveal>
              <svg className="steps-path" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 80 20 C 300 -10, 400 50, 500 20 S 760 -10, 920 20" pathLength={1} />
              </svg>
              {t.how.steps.map((s, n) => (
                <li key={s.title} className="card step" style={i(n)}>
                  <span className={`step-num tone-${TONES[n * 2 % TONES.length]}`}>{n + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Aster companion ─────────────────────────────── */}
        <section id="aster" className="section">
          <div className="container aster-grid">
            <div className="section-head" style={{ marginBottom: 0 }} data-reveal>
              <span className="eyebrow">{t.aster.eyebrow}</span>
              <h2 className="display">{t.aster.title}</h2>
              <p className="lead">{t.aster.body}</p>
              <ul className="points">
                {t.aster.points.map((p, n) => (
                  <li key={p} style={i(n)}>
                    <span className="point-star" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card chat" aria-label="Aster" data-reveal>
              <div className="chat-head">
                <span className="chat-avatar" data-loop>
                  <Aster id="chat-aster" stage={3} size={48} />
                </span>
                <span>
                  Aster
                  <small className="chat-status">
                    <span className="pulse-dot" aria-hidden="true" />
                    {t.aster.status}
                  </small>
                </span>
              </div>
              {t.aster.chat.map((m, n) => (
                <p key={n} className={`bubble ${m.from}`} style={i(n)}>
                  {m.text}
                </p>
              ))}
              <span className="bubble aster typing" style={i(t.aster.chat.length)} aria-hidden="true" data-loop>
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        </section>

        {/* ── Privacy ──────────────────────────────────────── */}
        <section id="privacy" className="section">
          <div className="container">
            <div className="section-head" data-reveal>
              <span className="eyebrow">{t.privacy.eyebrow}</span>
              <h2 className="display">{t.privacy.title}</h2>
            </div>
            <div className="privacy-grid">
              {t.privacy.items.map((p, n) => (
                <div key={p.title} className="card privacy-item tilt" data-reveal style={i(n % 2)}>
                  <span className="privacy-icon">
                    <ShieldIcon />
                  </span>
                  <div>
                    <h3>{p.title}</h3>
                    <p>{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Plans ────────────────────────────────────────── */}
        <section id="plans" className="section">
          <div className="container">
            <div className="section-head center" data-reveal>
              <span className="eyebrow">{t.plans.eyebrow}</span>
              <h2 className="display">{t.plans.title}</h2>
            </div>
            <div className="plans-grid">
              {[{ ...t.plans.free, badge: null }, t.plans.premium].map((plan, n) => (
                <div
                  key={plan.name}
                  className={`card plan${plan.badge ? ' premium run-light' : ''}`}
                  data-reveal
                  data-loop={plan.badge ? true : undefined}
                  style={i(n)}
                >
                  {plan.badge && <span className="plan-badge">{plan.badge}</span>}
                  <h3 className="plan-name">{plan.name}</h3>
                  <p className="plan-tag">{plan.tagline}</p>
                  <ul>
                    {plan.items.map((item, k) => (
                      <li key={item} style={{ '--k': k } as CSSProperties}>
                        <CheckIcon />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="plans-note" data-reveal>
              {t.plans.note}
            </p>
          </div>
        </section>

        {/* ── Waitlist / final CTA ─────────────────────────── */}
        <section id="waitlist" className="section">
          <div className="container">
            <div className="card waitlist" data-reveal>
              <Starfield seed="waitlist" count={36} shooting={1} />
              <div className="waitlist-aster" data-loop>
                <Aster id="waitlist-aster" stage={4} size="100%" />
              </div>
              <span className="eyebrow">{t.waitlist.eyebrow}</span>
              <h2 className="display">{t.waitlist.title}</h2>
              <p className="lead">{t.waitlist.body}</p>
              {site.appStoreUrl ? (
                <div className="hero-ctas center">{primaryCta}</div>
              ) : (
                <WaitlistForm t={t.waitlist} locale={locale} />
              )}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section id="faq" className="section">
          <div className="container">
            <div className="section-head center" data-reveal>
              <span className="eyebrow">{t.faq.eyebrow}</span>
              <h2 className="display">{t.faq.title}</h2>
            </div>
            <div className="faq">
              {t.faq.items.map((item, n) => (
                <details key={item.q} data-reveal style={i(n % 3)}>
                  <summary>
                    {item.q}
                    <span className="faq-plus" aria-hidden="true" />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
