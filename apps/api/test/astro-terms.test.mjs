// Turkish names for the English astrology vocabulary in Turkish prompts and
// template readings. Run: npm test --workspace @astroflow/api
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localizeAstroDeep, localizeAstroTerms } from '../src/common/ai/astro-terms.ts';

test('signs, planets, points and aspects become Turkish in Turkish text', () => {
  assert.equal(
    localizeAstroTerms('Güneş Scorpio, Ay Sagittarius, Yükselen Aries. Mars square Sun; North Node Pisces.', 'tr'),
    'Güneş Akrep, Ay Yay, Yükselen Koç. Mars kare Güneş; Kuzey Ay Düğümü Balık.',
  );
  assert.equal(localizeAstroTerms('baskın element Fire, baskın nitelik Fixed', 'tr'), 'baskın element Ateş, baskın nitelik Sabit');
});

test('whole words only, Turkish words untouched, English passes through', () => {
  assert.equal(localizeAstroTerms('Sunduğu Leopar Marsilya güneşli', 'tr'), 'Sunduğu Leopar Marsilya güneşli');
  assert.equal(localizeAstroTerms('Sun in Scorpio', 'en'), 'Sun in Scorpio');
});

test('deep localisation rewrites every string and keeps the shape', () => {
  const stub = { title: 'Mars → Sun', themes: [{ area: 'love', text: 'Venus Libra' }], count: 2 };
  assert.deepEqual(localizeAstroDeep(stub, 'tr'), {
    title: 'Mars → Güneş',
    themes: [{ area: 'love', text: 'Venüs Terazi' }],
    count: 2,
  });
  assert.equal(localizeAstroDeep(stub, 'en'), stub);
});
