import { getDict, isLocale, type Locale } from '@/i18n';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PhoneMock } from '@/components/PhoneMock';
import { ZodiacWheel } from '@/components/ZodiacWheel';
import { WaitlistForm } from '@/components/WaitlistForm';
import { CheckIcon, FeatureIcon, LogoMark, ShieldIcon } from '@/components/Icons';
import { site } from '@/lib/site';

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

  return (
    <>
      <Header locale={locale} />
      <main id="main">
        <section className="hero">
          <ZodiacWheel className="hero-wheel" />
          <div className="container">
            <div>
              <span className="eyebrow">{t.hero.eyebrow}</span>
              <h1 className="display">{t.hero.title}</h1>
              <p className="lead">{t.hero.tagline}</p>
              <div className="hero-ctas">
                <a href="#waitlist" className="btn">
                  {t.hero.primary}
                </a>
                <a href="#features" className="btn btn-ghost">
                  {t.hero.secondary}
                </a>
              </div>
              <p className="hero-note">{t.hero.note}</p>
            </div>
            <PhoneMock t={t.phone} />
          </div>
        </section>

        <div className="trust">
          <ul className="container">
            {t.trust.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <section id="features" className="section">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">{t.features.eyebrow}</span>
              <h2 className="display">{t.features.title}</h2>
              <p className="lead">{t.features.body}</p>
            </div>
            <div className="feature-grid">
              {t.features.items.map((f) => (
                <article key={f.title} className="card feature">
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

        <section className="section" aria-labelledby="how-title">
          <div className="container">
            <div className="section-head center">
              <span className="eyebrow">{t.how.eyebrow}</span>
              <h2 id="how-title" className="display">
                {t.how.title}
              </h2>
            </div>
            <ol className="steps">
              {t.how.steps.map((s) => (
                <li key={s.title} className="card step">
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="aster" className="section">
          <div className="container aster-grid">
            <div className="section-head" style={{ marginBottom: 0 }}>
              <span className="eyebrow">{t.aster.eyebrow}</span>
              <h2 className="display">{t.aster.title}</h2>
              <p className="lead">{t.aster.body}</p>
              <ul className="points">
                {t.aster.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div className="card chat" aria-label="Aster">
              <div className="chat-head">
                <LogoMark />
                Aster
              </div>
              {t.aster.chat.map((m, i) => (
                <p key={i} className={`bubble ${m.from}`} style={{ margin: 0 }}>
                  {m.text}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="section">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">{t.privacy.eyebrow}</span>
              <h2 className="display">{t.privacy.title}</h2>
            </div>
            <div className="privacy-grid">
              {t.privacy.items.map((p) => (
                <div key={p.title} className="card privacy-item">
                  <ShieldIcon />
                  <div>
                    <h3>{p.title}</h3>
                    <p>{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="plans" className="section">
          <div className="container">
            <div className="section-head center">
              <span className="eyebrow">{t.plans.eyebrow}</span>
              <h2 className="display">{t.plans.title}</h2>
            </div>
            <div className="plans-grid">
              {[
                { ...t.plans.free, badge: null },
                t.plans.premium,
              ].map((plan) => (
                <div key={plan.name} className={`card plan${plan.badge ? ' premium' : ''}`}>
                  {plan.badge && <span className="plan-badge">{plan.badge}</span>}
                  <h3 className="plan-name">{plan.name}</h3>
                  <p className="plan-tag">{plan.tagline}</p>
                  <ul>
                    {plan.items.map((item) => (
                      <li key={item}>
                        <CheckIcon />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="plans-note">{t.plans.note}</p>
          </div>
        </section>

        <section id="waitlist" className="section">
          <div className="container">
            <div className="card waitlist">
              <span className="eyebrow">{t.waitlist.eyebrow}</span>
              <h2 className="display">{t.waitlist.title}</h2>
              <p className="lead">{t.waitlist.body}</p>
              <WaitlistForm t={t.waitlist} locale={locale} />
            </div>
          </div>
        </section>

        <section id="faq" className="section">
          <div className="container">
            <div className="section-head center">
              <span className="eyebrow">{t.faq.eyebrow}</span>
              <h2 className="display">{t.faq.title}</h2>
            </div>
            <div className="faq">
              {t.faq.items.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
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
