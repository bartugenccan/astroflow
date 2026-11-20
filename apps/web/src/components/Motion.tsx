'use client';

import { useEffect } from 'react';

/**
 * The page's only motion script. Everything is visible without it: content
 * is hidden for a reveal only under `html.motion`, a class this effect adds
 * right before it starts observing, so a failed or blocked script leaves a
 * plain readable page.
 *
 * - [data-reveal] gets `.in` once it scrolls into view (stagger via --i).
 * - [data-loop] gets `.paused` while off-screen, stopping its infinite CSS
 *   animations.
 * - --mx/--my (pointer, -1…1) drive the hero parallax on fine pointers;
 *   --scroll (0…1) drives the progress bar; html.scrolled lifts the header.
 * - prefers-reduced-motion: nothing is hidden or moved; CSS shows final states.
 */
export function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      root.classList.add('reduced');
      return;
    }

    root.classList.add('motion');

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            reveal.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));

    const loops = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle('paused', !e.isIntersecting);
    });
    document.querySelectorAll('[data-loop]').forEach((el) => loops.observe(el));

    let frame = 0;
    let mx = 0;
    let my = 0;
    const paint = () => {
      frame = 0;
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty('--scroll', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
      root.style.setProperty('--mx', mx.toFixed(3));
      root.style.setProperty('--my', my.toFixed(3));
      root.classList.toggle('scrolled', window.scrollY > 8);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const fine = window.matchMedia('(pointer: fine)').matches;
    const onPointer = (e: PointerEvent) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
      schedule();
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    if (fine) window.addEventListener('pointermove', onPointer, { passive: true });
    paint();

    return () => {
      reveal.disconnect();
      loops.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pointermove', onPointer);
      root.classList.remove('motion');
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true" />;
}
