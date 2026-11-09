import type { Dict } from '@/i18n';

const SCORE = 0.78;
const RING = 2 * Math.PI * 16;

/** The Today tab, drawn in HTML so the hero needs no screenshot. Decorative. */
export function PhoneMock({ t }: { t: Dict['phone'] }) {
  return (
    <div className="phone-wrap" aria-hidden="true">
      <div className="phone">
        <div className="phone-screen">
          <div className="phone-notch" />
          <div className="phone-greet">{t.greeting}</div>
          <div className="phone-date">{t.date}</div>
          <div className="big-three">
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
          <div className="insight">
            <span className="eyebrow">{t.cardEyebrow}</span>
            <h3>{t.cardTitle}</h3>
            <p>{t.cardBody}</p>
          </div>
          <div className="score-row">
            <svg viewBox="0 0 40 40" className="score-ring">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#182042" strokeWidth="4" />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="#D9B964"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${RING * SCORE} ${RING}`}
                transform="rotate(-90 20 20)"
              />
              <text x="20" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill="#F3EFE4">
                {Math.round(SCORE * 100)}
              </text>
            </svg>
            {t.score}
          </div>
          <span className="btn">{t.aster}</span>
        </div>
      </div>
    </div>
  );
}
