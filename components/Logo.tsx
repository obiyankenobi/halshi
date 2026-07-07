interface LogoProps {
  size?: number;
  /** Color of the H stems. */
  stem?: string;
  /** Color of the chart arrow. */
  arrow?: string;
  className?: string;
}

/**
 * Halshi mark: a slanted H whose crossbar is a rising chart arrow.
 * Defaults are tuned for the dark theme; pass stem/arrow to recolor
 * (brand print version is navy #1c2b4a + emerald #20b273, see public/logo.svg).
 */
export default function Logo({ size = 32, stem = '#edf0f5', arrow = '#c8f53f', className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Halshi"
    >
      <path d="M69 47 L63 86" stroke={stem} strokeWidth="17" strokeLinecap="round" fill="none" />
      <path
        d="M36 46 L55 60 L77 32"
        stroke={arrow}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <polygon points="89,17 86.5,37.3 69.9,24.3" fill={arrow} />
      <path d="M40 10 L31 86" stroke={stem} strokeWidth="17" strokeLinecap="round" fill="none" />
    </svg>
  );
}
