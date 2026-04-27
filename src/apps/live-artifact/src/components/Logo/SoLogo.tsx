/**
 * SoLogo — 3-row × 4-col Braille-dot pattern spelling "SO".
 *
 * Ported verbatim from the Claude Design handoff
 * (staging/2026-04-26-live-artifact-design/.../shell.jsx). Uses CSS
 * variables (--accent, --border-strong) so dark/light theme drift
 * happens at the token layer, not in the component.
 */

const SO_LOGO_DOTS: ReadonlyArray<ReadonlyArray<0 | 1>> = [
  [1, 1, 1, 1],
  [1, 0, 1, 1],
  [0, 1, 1, 1],
];

export interface SoLogoProps {
  size?: number;
}

export function SoLogo({ size = 14 }: SoLogoProps) {
  const cell = size / 4.2;
  const r = cell * 0.3;
  const offX = (size - cell * 3) / 2;
  const offY = (size - cell * 2) / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {SO_LOGO_DOTS.map((row, ri) =>
        row.map((on, ci) => (
          <circle
            key={`${ri}-${ci}`}
            cx={offX + ci * cell}
            cy={offY + ri * cell}
            r={r}
            fill={on ? 'var(--accent)' : 'var(--border-strong)'}
          />
        )),
      )}
    </svg>
  );
}
