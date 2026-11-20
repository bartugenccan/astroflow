import type { CSSProperties } from 'react';
import type { Dict } from '@/i18n';
import { Aster } from './Aster';
import { CheckIcon } from './Icons';

const SCORE = 0.78;
const RING = 2 * Math.PI * 16;

/**
 * The Today tab, drawn in HTML so the hero needs no screenshot. Decorative.
 * Its parts arrive one after another (CSS `pop` with --i) and the reward pill
 * keeps popping in, the way it does in the app after a practice.
 */
export function PhoneMock({ t }: { t: Dict['phone'] }) {
  return (
    <div className="phone-wrap" aria-hidden="true">
      <div className="phone-orbit" data-loop>
        <span className="orbit-dot tone-candy" />
        <span className="orbit-dot tone-sky" />
        <span className="orbit-dot tone-mint" />
      </div>
      <div className="phone">
        <div className="phone-screen">
          <div className="phone-notch" />
          <div className="phone-top hero-pop" style={{ '--i': 1 } as CSSProperties}>
            <div>
              <div className="phone-greet">{t.greeting}</div>
              <div className="phone-date">{t.date}</div>
            </div>
            <span className="chip tone-star">{t.streak}</span>
          </div>

          <div className="phone-aster hero-pop" style={{ '--i': 2 } as CSSProperties}>
            <Aster id="phone-aster" stage={3} size={92} />
            <div className="phone-quests">
              <small>{t.questsTitle}</small>
              {t.quests.map((q, i) => (
                <span key={q} className={`quest${i < 2 ? ' done' : ''}`} style={{ '--q': i } as CSSProperties}>
                  <span className="quest-box">{i < 2 ? <CheckIcon /> : null}</span>
                  {q}
                </span>
              ))}
            </div>
          </div>

          <div className="big-three hero-pop" style={{ '--i': 3 } as CSSProperties}>
            <div>
              <small>{t.sun}</small>
              <strong>{t.sunSign}</strong>
            </div>
            <div>
              <small>{t.moon}</small>
              <strong>{t.moonSign}</strong>
            </div>
            <div>
              <small>{t.rising}</small>
              <strong>{t.risingSign}</strong>
            </div>
          </div>

          <div className="insight run-light hero-pop" style={{ '--i': 4 } as CSSProperties} data-loop>
            <span className="eyebrow">{t.cardEyebrow}</span>
            <h3>{t.cardTitle}</h3>
            <p>{t.cardBody}</p>
            <div className="score-row">
              <svg viewBox="0 0 40 40" className="score-ring">
                <circle cx="20" cy="20" r="16" className="score-track" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  className="score-fill"
                  strokeDasharray={`${RING * SCORE} ${RING}`}
                  transform="rotate(-90 20 20)"
                />
                <text x="20" y="24" textAnchor="middle" className="score-text">
                  {Math.round(SCORE * 100)}
                </text>
              </svg>
              {t.score}
            </div>
          </div>

          <span className="btn btn-sm btn-block hero-pop" style={{ '--i': 5 } as CSSProperties}>
            {t.aster}
          </span>
        </div>
      </div>

      <div className="reward-pill" data-loop>
        <span className="reward-icon">
          <Aster id="pill-aster" stage={2} size={34} mood="glowing" />
        </span>
        <span>
          <strong>{t.reward}</strong>
          <small>{t.rewardBody}</small>
        </span>
      </div>
    </div>
  );
}
