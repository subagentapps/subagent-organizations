/* ============================================================
   Shell — top bar, avatar logo (Braille SO), 4 underline tabs,
   live status pill, GitHub link.
   ============================================================ */

const SO_LOGO_DOTS = [
  [1, 1, 1, 1],
  [1, 0, 1, 1],
  [0, 1, 1, 1],
];

const SoLogo = ({ size = 14 }) => {
  const cell = size / 4.2;
  const r = cell * 0.3;
  const offX = (size - cell * 3) / 2;
  const offY = (size - cell * 2) / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {SO_LOGO_DOTS.map((row, ri) =>
        row.map((on, ci) => (
          <circle
            key={`${ri}-${ci}`}
            cx={offX + ci * cell}
            cy={offY + ri * cell}
            r={r}
            fill={on ? "var(--accent)" : "var(--border-strong)"}
          />
        ))
      )}
    </svg>
  );
};

/* Field: sparse Braille-dot backdrop. Dashboard route only. */
const Field = () => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const GLYPHS = ["⠁","⠂","⠄","⠈","⠐","⠠","⡀","⢀","⠃","⠉","⠊","⠌","⠑","⠒","⠔","⠕"];
    const CELL = 22;
    let dpr = 1, w = 0, h = 0, cols = 0, rows = 0, dots = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      if (!w || !h) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CELL); rows = Math.ceil(h / CELL);
      dots = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.07) dots.push({
          x: c * CELL + CELL / 2,
          y: r * CELL + CELL / 2,
          g: GLYPHS[(Math.random() * GLYPHS.length) | 0],
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    let raf = 0, lastFrame = 0, lastFlip = 0;
    const FRAME_MS = 600;
    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;
      ctx.clearRect(0, 0, w, h);
      ctx.font = "11px ui-monospace, monospace";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const t = now * 0.001;
      for (const d of dots) {
        const a = 0.5 + 0.5 * Math.sin(t * 0.6 + d.phase);
        ctx.fillStyle = `rgba(255,255,255,${(0.4 + a * 0.6).toFixed(3)})`;
        ctx.fillText(d.g, d.x, d.y);
      }
      if (now - lastFlip > 1200) {
        lastFlip = now;
        const flips = Math.max(1, (dots.length * 0.03) | 0);
        for (let i = 0; i < flips; i++) {
          const idx = (Math.random() * dots.length) | 0;
          if (dots[idx]) dots[idx].g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <div className="field" aria-hidden="true"><canvas ref={ref} /></div>;
};

/* Top bar */
const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "plugins",   label: "Plugins" },
  { id: "adr",       label: "ADR" },
  { id: "changelog", label: "Changelog" },
];

const TopBar = ({ route, onRoute }) => (
  <header className="topbar">
    <div className="tb-brand">
      <span className="tb-avatar"><SoLogo size={14} /></span>
      <span className="tb-crumb">
        <span className="dim">subagent</span><span className="sep">/</span>subagent-organizations
      </span>
    </div>

    <nav className="tb-tabs">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tb-tab ${route === t.id ? "is-active" : ""}`}
          onClick={() => onRoute(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>

    <div className="tb-meta">
      <span className="tb-status"><span className="dot"></span>on track</span>
      <a className="tb-gh" href="https://github.com/subagentorganizations" target="_blank" rel="noreferrer">
        View on GitHub <span aria-hidden="true">↗</span>
      </a>
    </div>
  </header>
);

window.SoLogo = SoLogo;
window.Field = Field;
window.TopBar = TopBar;
