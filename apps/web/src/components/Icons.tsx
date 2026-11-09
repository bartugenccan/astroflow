import type { ReactElement, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** The app icon's mark: ring, crescent and two four-point stars. */
export function LogoMark(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <circle cx="32" cy="32" r="29" fill="none" stroke="#E7CD8F" strokeWidth="2.4" />
      <path d="M28.5 15.5a17 17 0 1 0 9.5 31.1A14.6 14.6 0 0 1 28.5 15.5z" fill="#E1C47C" />
      <path d="M40 21.5l1.5 5.5 5.5 1.3-5.5 1.3-1.5 5.6-1.5-5.6-5.5-1.3 5.5-1.3z" fill="#E7CD8F" />
      <path d="M44 36l.7 2.4 2.3.6-2.3.6-.7 2.4-.7-2.4-2.3-.6 2.3-.6z" fill="#E7CD8F" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z" />
      <path d="M8.8 12l2.2 2.2 4.4-4.4" />
    </svg>
  );
}

const featurePaths: Record<string, ReactElement> = {
  chart: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 3v4.5M12 16.5V21M3 12h4.5M16.5 12H21M5.6 5.6l3.2 3.2M15.2 15.2l3.2 3.2M18.4 5.6l-3.2 3.2M8.8 15.2l-3.2 3.2" />
    </>
  ),
  transit: (
    <>
      <circle cx="12" cy="12" r="8.5" strokeDasharray="2.5 2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="18.5" cy="6.8" r="1.8" fill="currentColor" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
    </>
  ),
  aster: (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z" />
      <path d="M12 7.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill="currentColor" stroke="none" />
    </>
  ),
  tarot: (
    <>
      <rect x="4" y="5" width="10" height="15" rx="2" transform="rotate(-8 9 12.5)" />
      <rect x="10" y="4" width="10" height="15" rx="2" transform="rotate(8 15 11.5)" />
      <path d="M15 9.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill="currentColor" stroke="none" />
    </>
  ),
  heart: (
    <>
      <circle cx="9" cy="12" r="5.5" />
      <circle cx="15" cy="12" r="5.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12.5" r="8" />
      <path d="M12 8v4.5l3 2M9.5 2.5h5" />
    </>
  ),
  doc: (
    <>
      <path d="M7 3h7l4 4v14H7a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 7 3z" />
      <path d="M14 3v4h4M9 12h6M9 15.5h6M9 8.5h2.5" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
      <path d="M18 16l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z" />
    </>
  ),
};

export function FeatureIcon({ name, ...props }: IconProps & { name: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      {featurePaths[name] ?? featurePaths.spark}
    </svg>
  );
}
