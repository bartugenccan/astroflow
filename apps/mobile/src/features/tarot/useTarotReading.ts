import { useCallback, useEffect, useRef, useState } from "react";
import { astrologyApi } from "../../services/astrologyApi";
import { cachedCall, tarotCardKey, tarotSynthesisKey } from "../../services/interpretationCache";
import type { CreateBirthProfileDto, TarotCardReading, TarotSpread, TarotSynthesis } from "../../services/types";
import type { Locale } from "../../i18n";
import { tarotToday, useTarotStore } from "../../store/useTarotStore";

export interface Part<T> {
  data: T | null;
  error: boolean;
}

/**
 * Fetches the three card readings and the synthesis in parallel, so each
 * section fills in as soon as its own AI call returns. Results are saved to
 * the tarot store as they land — reopening the tab later the same day shows
 * the reading without another request.
 */
export function useTarotReading(
  dto: CreateBirthProfileDto | null,
  spread: TarotSpread,
  locale: Locale,
) {
  const saved = useTarotStore((s) => s.lastReading);
  const saveCard = useTarotStore((s) => s.saveCard);
  const saveSynthesis = useTarotStore((s) => s.saveSynthesis);
  const startReading = useTarotStore((s) => s.startReading);

  // Saved parts only count if they belong to this very spread, day and language.
  const own = saved && saved.spread === spread && saved.locale === locale ? saved : null;

  const [cards, setCards] = useState<Part<TarotCardReading>[]>(() =>
    spread.cards.map((_, i) => ({ data: own?.cards[i] ?? null, error: false })),
  );
  const [synthesis, setSynthesis] = useState<Part<TarotSynthesis>>(() => ({
    data: own?.synthesis ?? null,
    error: false,
  }));
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const loadCard = useCallback(
    (index: number, force = false) => {
      if (!dto) return;
      setCards((prev) => prev.map((p, i) => (i === index ? { ...p, error: false } : p)));
      const date = own?.date ?? tarotToday();
      cachedCall(
        tarotCardKey(dto, spread, index, date, locale),
        () => astrologyApi.getTarotCard(dto, spread, index, locale),
        force,
      )
        .then((reading) => {
          saveCard(index, reading);
          if (alive.current) setCards((prev) => prev.map((p, i) => (i === index ? { data: reading, error: false } : p)));
        })
        .catch(() => {
          if (alive.current) setCards((prev) => prev.map((p, i) => (i === index ? { ...p, error: true } : p)));
        });
    },
    [dto, spread, locale, own?.date, saveCard],
  );

  const loadSynthesis = useCallback(
    (force = false) => {
      if (!dto) return;
      setSynthesis((prev) => ({ ...prev, error: false }));
      const date = own?.date ?? tarotToday();
      cachedCall(
        tarotSynthesisKey(dto, spread, date, locale),
        () => astrologyApi.getTarotSynthesis(dto, spread, locale),
        force,
      )
        .then((result) => {
          saveSynthesis(result);
          if (alive.current) setSynthesis({ data: result, error: false });
        })
        .catch(() => {
          if (alive.current) setSynthesis((prev) => ({ ...prev, error: true }));
        });
    },
    [dto, spread, locale, own?.date, saveSynthesis],
  );

  useEffect(() => {
    // Same spread opened in another language: start its saved copy over in this one.
    if (saved && saved.spread === spread && saved.locale !== locale) startReading(spread, locale);
    cards.forEach((c, i) => {
      if (!c.data) loadCard(i);
    });
    if (!synthesis.data) loadSynthesis();
    // Once per spread — retries go through the returned callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread, dto]);

  return {
    cards,
    synthesis,
    retryCard: (index: number) => loadCard(index, true),
    retrySynthesis: () => loadSynthesis(true),
  };
}
