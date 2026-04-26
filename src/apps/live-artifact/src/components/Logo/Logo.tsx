/**
 * Logo — 24×24 SVG with Braille-dot pattern.
 *
 * Spec: design-brief says "6-dot grid, 3 dots active forming the letters
 * 'SO' if possible". A literal Braille SO = ⠎⠕ (S = dots 2,3,4; O = dots
 * 1,3,5). To fit in 24×24 we render a single combined cell using all 6
 * dot positions, with the active dots at positions S∪O = {1,2,3,4,5}.
 * That leaves position 6 (bottom-right) empty — readable as an "open"
 * stamp.
 */
export interface LogoProps {
  size?: number;
  active?: string;
  inactive?: string;
}

const ACTIVE_POSITIONS = new Set([1, 2, 3, 4, 5]); // SO union

const POSITIONS: Record<number, { cx: number; cy: number }> = {
  1: { cx: 8,  cy: 6  },
  2: { cx: 8,  cy: 12 },
  3: { cx: 8,  cy: 18 },
  4: { cx: 16, cy: 6  },
  5: { cx: 16, cy: 12 },
  6: { cx: 16, cy: 18 },
};

export function Logo({
  size = 24,
  active = 'currentColor',
  inactive = 'rgba(255,255,255,0.12)',
}: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="subagent-organizations"
      xmlns="http://www.w3.org/2000/svg"
    >
      {Object.entries(POSITIONS).map(([key, { cx, cy }]) => {
        const n = Number(key);
        const isActive = ACTIVE_POSITIONS.has(n);
        return (
          <circle
            key={n}
            cx={cx}
            cy={cy}
            r={2}
            fill={isActive ? active : inactive}
          />
        );
      })}
    </svg>
  );
}
