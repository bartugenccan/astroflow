/** Decorative chart wheel behind the hero: rings, 12 house spokes, degree ticks. */
export function ZodiacWheel({ className }: { className?: string }) {
  const spokes = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);
  const ticks = Array.from({ length: 72 }, (_, i) => (i * Math.PI) / 36);
  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden="true">
      <g fill="none" stroke="#E7CD8F" strokeWidth="0.35">
        <circle r="96" />
        <circle r="84" />
        <circle r="56" />
        <circle r="30" strokeDasharray="1 2" />
        {spokes.map((a) => (
          <line key={a} x1={Math.cos(a) * 56} y1={Math.sin(a) * 56} x2={Math.cos(a) * 96} y2={Math.sin(a) * 96} />
        ))}
        {ticks.map((a) => (
          <line key={a} x1={Math.cos(a) * 84} y1={Math.sin(a) * 84} x2={Math.cos(a) * 87} y2={Math.sin(a) * 87} />
        ))}
        <polygon points="0,-56 48.5,28 -48.5,28" strokeDasharray="2 1.5" />
        <line x1="-56" y1="0" x2="56" y2="0" strokeDasharray="2 1.5" />
      </g>
    </svg>
  );
}
