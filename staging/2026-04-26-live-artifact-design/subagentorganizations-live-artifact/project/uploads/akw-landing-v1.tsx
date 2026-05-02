import { useState, useMemo, useEffect, useRef } from "react";
import {
  Github,
  ArrowUpRight,
  Check,
  Circle,
  ChevronRight,
  ChevronDown,
  GitPullRequest,
  GitCommit,
  Flag,
  CircleDot,
  Clock,
} from "lucide-react";

// ============================================================================
// Palette — flat surfaces, cooler teal (#0097A7 family), one role per color
// Elevation = background value shift + 1px border, never shadow or gradient
// ============================================================================
const C = {
  // Surfaces, darkest → lightest (one-stop shifts, flat hex only)
  bg: "#000000",          // outer canvas — pure black
  surface: "#0A0A0A",     // active/hover row in nav; code block
  surfaceHi: "#111111",   // milestone row hover
  surfaceRow: "#0D0D0D",  // issue/task row hover
  // Borders — flat, subtle
  border: "#1A1A1A",      // standard 1px separator
  borderHi: "#262626",    // emphasized separator / hover edge
  // Text
  text: "#F5F2ED",
  textDim: "#8F9997",
  textMute: "#5A6462",
  // Teal — cooler, bluer, unambiguous. Used consistently per role.
  teal: "#0097A7",        // PRIMARY accent (progress, active, links)
  tealHi: "#00BCD4",      // completed / success state
  tealLo: "#4DD0E1",      // secondary accent / code highlight
  tealDeep: "#00606B",    // deep fill / logo base
  tealBg: "rgba(0, 151, 167, 0.10)",    // subtle active-row background
  tealBgHi: "rgba(0, 151, 167, 0.18)",  // stronger selection background
  // Reserved for status only
  amber: "#F59E0B",
  red: "#EF4444",
};

const FONT = {
  sans: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  mono: `'JetBrains Mono', 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace`,
};

// ============================================================================
// Data model: Projects → Milestones → Issues → Tasks
// ============================================================================
const PROJECTS = [
  {
    id: "akw-site",
    name: "agentknowledgeworkers.com",
    repo: "agentknowledgeworkers/agentknowledgeworkers",
    description:
      "The marketing site, dogfooding kwpc. Progress here is driven by milestones in knowledge-work-plugins-cli.",
    status: "on_track",
    startDate: "2026-04",
    targetDate: "2026-06",
    summary: { milestones: 4, issues: 18, tasks: 47, done: 12 },
  },
  {
    id: "kwpc",
    name: "kwpc migration",
    repo: "agentknowledgeworkers/knowledge-work-plugins-cli",
    description:
      "Port the knowledge-work plugin suite to Claude Code CLI. 14 plugins, 8 acceptance tests each, 16-week plan.",
    status: "on_track",
    startDate: "2026-04",
    targetDate: "2026-08",
    summary: { milestones: 16, issues: 128, tasks: 214, done: 72 },
  },
  {
    id: "schema",
    name: "packages/schema",
    repo: "agentknowledgeworkers/knowledge-work-plugins-cli",
    description: "Shared GraphQL schema + curl client. Foundation for PM plugin coordination.",
    status: "on_track",
    startDate: "2026-04",
    targetDate: "2026-05",
    summary: { milestones: 2, issues: 9, tasks: 24, done: 24 },
  },
  {
    id: "platform-engineering",
    name: "platform-engineering",
    repo: "agentknowledgeworkers/knowledge-work-plugins-cli",
    description: "/skill-creator, /plugin-customizer, /stack-check. Authoring surface pinned.",
    status: "on_track",
    startDate: "2026-04",
    targetDate: "2026-05",
    summary: { milestones: 1, issues: 8, tasks: 19, done: 19 },
  },
  {
    id: "productivity-cli",
    name: "productivity-cli",
    repo: "agentknowledgeworkers/knowledge-work-plugins-cli",
    description: "Tasks, memory, coordination. Dogfooded to run this very project.",
    status: "on_track",
    startDate: "2026-05",
    targetDate: "2026-06",
    summary: { milestones: 1, issues: 8, tasks: 22, done: 16 },
  },
  {
    id: "product-management-cli",
    name: "product-management-cli",
    repo: "agentknowledgeworkers/knowledge-work-plugins-cli",
    description: "Spec drafting, sprint-planning, stakeholder updates — writes from GitHub state.",
    status: "at_risk",
    startDate: "2026-05",
    targetDate: "2026-06",
    summary: { milestones: 1, issues: 8, tasks: 20, done: 11 },
  },
  {
    id: "data-cli",
    name: "data-cli",
    repo: "agentknowledgeworkers/knowledge-work-plugins-cli",
    description: "Terminal data analyst. DuckDB-first, warehouse MCPs optional.",
    status: "on_track",
    startDate: "2026-04",
    targetDate: "2026-05",
    summary: { milestones: 1, issues: 8, tasks: 17, done: 17 },
  },
  {
    id: "it-admin",
    name: "it-admin",
    repo: "agentknowledgeworkers/knowledge-work-plugins-cli",
    description: "ant admin * wrapper. Full Admin API coverage.",
    status: "on_track",
    startDate: "2026-04",
    targetDate: "2026-05",
    summary: { milestones: 1, issues: 8, tasks: 15, done: 15 },
  },
];

// Detail payloads for the default project (akw-site)
const PROJECT_DETAIL = {
  "akw-site": {
    milestones: [
      {
        id: "M1",
        title: "Landing page v1",
        dueOn: "2026-05-02",
        status: "in_progress",
        pct: 60,
        issues: [
          {
            id: 101,
            title: "Hero + single-screen dashboard shell",
            state: "closed",
            pr: "#12",
            sprint: "S1",
            tasks: [
              { id: "T-0a1", title: "Scaffold Vite + React + CF Pages deploy", status: "completed", tool: "Bash", sprint: "S1" },
              { id: "T-0a2", title: "Design token palette (black + teal)", status: "completed", tool: "Write", sprint: "S1" },
              { id: "T-0a3", title: "Top bar with repo path + status pill", status: "completed", tool: "Write", sprint: "S1" },
              { id: "T-0a4", title: "Responsive no-scroll viewport layout", status: "completed", tool: "Edit", sprint: "S1" },
            ],
          },
          {
            id: 102,
            title: "Project tracker — Milestones → Issues → Tasks tree",
            state: "open",
            pr: "#17",
            sprint: "S2",
            tasks: [
              { id: "T-0b1", title: "Data schema: PROJECTS → MILESTONES → ISSUES → TASKS", status: "completed", tool: "Write", sprint: "S2" },
              { id: "T-0b2", title: "Expandable tree with keyboard + click handlers", status: "in_progress", tool: "Edit", sprint: "S2" },
              { id: "T-0b3", title: "Selection state: task | issue | milestone | project", status: "in_progress", tool: "Edit", sprint: "S2" },
              { id: "T-0b4", title: "Right panel: contextual detail per selection type", status: "pending", tool: "Write", sprint: "S2" },
              { id: "T-0b5", title: "Progress bars driven by closed-issue count", status: "pending", tool: "Edit", sprint: "S2" },
            ],
          },
          {
            id: 103,
            title: "Live data: GraphQL fetch against kwpc repo",
            state: "open",
            pr: null,
            sprint: "S3",
            tasks: [
              { id: "T-0c1", title: "GraphQL query: milestones + issues by label", status: "pending", tool: "Write", sprint: "S3" },
              { id: "T-0c2", title: "Cache layer (5 min TTL via CF KV)", status: "pending", tool: "Bash", sprint: "S3" },
              { id: "T-0c3", title: "Fallback to static JSON on API failure", status: "pending", tool: "Edit", sprint: "S3" },
            ],
          },
        ],
      },
      {
        id: "M2",
        title: "Copywriting + editorial polish",
        dueOn: "2026-05-16",
        status: "queued",
        pct: 0,
        issues: [
          {
            id: 201,
            title: "Hero + value prop copy against Stripe/Linear reference",
            state: "open",
            pr: null,
            sprint: "S4",
            tasks: [
              { id: "T-0d1", title: "Draft 5 hero variants via /write-spec", status: "pending", tool: "Skill", sprint: "S4" },
              { id: "T-0d2", title: "Stakeholder review session", status: "pending", tool: "AskUserQuestion", sprint: "S4" },
            ],
          },
          {
            id: 202,
            title: "Per-plugin landing pages (14 subpages)",
            state: "open",
            pr: null,
            sprint: "S4",
            tasks: [
              { id: "T-0d3", title: "Route: /plugins/[name]", status: "pending", tool: "Write", sprint: "S4" },
              { id: "T-0d4", title: "Template: intro · commands · skills · MCPs", status: "pending", tool: "Write", sprint: "S4" },
            ],
          },
        ],
      },
      {
        id: "M3",
        title: "Docs subsite (Mintlify or in-repo)",
        dueOn: "2026-05-30",
        status: "queued",
        pct: 0,
        issues: [
          {
            id: 301,
            title: "ADR structure under /docs/adr",
            state: "open",
            pr: null,
            sprint: "S5",
            tasks: [
              { id: "T-0e1", title: "Template: ADR 0001 through 0006", status: "pending", tool: "Write", sprint: "S5" },
            ],
          },
        ],
      },
      {
        id: "M4",
        title: "v2: Swift iOS companion",
        dueOn: "2026-06-20",
        status: "queued",
        pct: 0,
        issues: [
          {
            id: 401,
            title: "Xcode project with Claude Agent SDK",
            state: "open",
            pr: null,
            sprint: "S6",
            tasks: [],
          },
        ],
      },
    ],
  },
};

// Fallback stub for other projects (kwpc, schema, etc.)
const defaultDetail = (proj) => ({
  milestones: [
    {
      id: "M1",
      title: `${proj.name} — Wave 0`,
      dueOn: proj.targetDate,
      status: "in_progress",
      pct: 50,
      issues: [
        {
          id: 1,
          title: "T1–T4 acceptance tests (static correctness)",
          state: "open",
          pr: null,
          sprint: "S1",
          tasks: [
            { id: "T-x1", title: "T1: manifest validity", status: "completed", tool: "Bash", sprint: "S1" },
            { id: "T-x2", title: "T2: skill frontmatter lint", status: "completed", tool: "Bash", sprint: "S1" },
            { id: "T-x3", title: "T3: command frontmatter lint", status: "in_progress", tool: "Bash", sprint: "S1" },
            { id: "T-x4", title: "T4: MCP reachable", status: "pending", tool: "Bash", sprint: "S1" },
          ],
        },
        {
          id: 2,
          title: "T5–T8 acceptance tests (functional + docs)",
          state: "open",
          pr: null,
          sprint: "S2",
          tasks: [
            { id: "T-x5", title: "T5: skills fire on triggers", status: "pending", tool: "Bash", sprint: "S2" },
            { id: "T-x6", title: "T6: commands on fixtures", status: "pending", tool: "Bash", sprint: "S2" },
            { id: "T-x7", title: "T7: GraphQL round-trip", status: "pending", tool: "Bash", sprint: "S2" },
            { id: "T-x8", title: "T8: docs complete", status: "pending", tool: "Read", sprint: "S2" },
          ],
        },
      ],
    },
  ],
});

// ============================================================================
// Color helpers — teal-dominant
// ============================================================================
function statusColor(s) {
  if (s === "completed" || s === "closed" || s === "on_track") return C.tealHi;
  if (s === "in_progress") return C.teal;
  if (s === "pending" || s === "queued" || s === "open") return C.textMute;
  if (s === "at_risk") return C.amber;
  if (s === "blocked") return C.red;
  return C.textMute;
}

function statusLabel(s) {
  if (s === "completed") return "completed";
  if (s === "in_progress") return "in progress";
  if (s === "pending") return "pending";
  if (s === "queued") return "queued";
  if (s === "closed") return "closed";
  if (s === "open") return "open";
  if (s === "on_track") return "on track";
  if (s === "at_risk") return "at risk";
  if (s === "blocked") return "blocked";
  return s;
}

// ============================================================================
// Halftone backdrop — REMOVED (was simulating light/depth; conflicts with flat surfaces)
// ============================================================================
function HalftoneGlow() {
  return null;
}

// ============================================================================
// BrailleField — dense animated ASCII/Braille field (asc11.com-inspired).
// Flat: single teal color, alpha-only variation. Dynamic: flowing noise +
// wandering bright spots + twinkle.
// ============================================================================
function BrailleField() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = mql.matches;
    const onMql = (e) => (reducedMotion.current = e.matches);
    mql.addEventListener?.("change", onMql);

    // Dense Braille glyph set — more variety for the "data rain" look
    const GLYPHS = [
      "⠁","⠂","⠃","⠄","⠅","⠆","⠇","⠈","⠉","⠊","⠋","⠌","⠍","⠎","⠏",
      "⠐","⠑","⠒","⠓","⠔","⠕","⠖","⠗","⠘","⠙","⠚","⠛","⠜","⠝","⠞","⠟",
      "⠠","⠡","⠢","⠣","⠤","⠥","⠦","⠧","⠨","⠩","⠪","⠫","⠬","⠭","⠮","⠯",
      "⠰","⠱","⠲","⠳","⠴","⠵","⠶","⠷","⠸","⠹","⠺","⠻","⠼","⠽","⠾","⠿",
      "⡀","⡁","⡂","⡃","⡄","⡅","⡆","⡇","⡈","⡉","⡊","⡋","⡌","⡍","⡎","⡏",
      "⢀","⢁","⢂","⢃","⢄","⢅","⢆","⢇","⢈","⢉","⢊","⢋","⢌","⢍","⢎","⢏",
      "⣀","⣁","⣂","⣃","⣄","⣅","⣆","⣇","⣈","⣉","⣊","⣋","⣌","⣍","⣎","⣏",
      "⣾","⣽","⣻","⣷","⣶","⣿",
    ];
    const GL = GLYPHS.length;

    // Grid — tight, asc11-like density
    const CELL_W = 8;
    const CELL_H = 10;
    let w = 0, h = 0, dpr = 1;
    let cols = 0, rows = 0;
    let cells = [];

    // Wandering bright spots — create the "highlighted patch" drift
    const SPOTS = 3;
    const spots = Array.from({ length: SPOTS }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00008,
      vy: (Math.random() - 0.5) * 0.00008,
      radius: 0.15 + Math.random() * 0.15,
      intensity: 0.35 + Math.random() * 0.25,
    }));

    // Cheap 2D value-noise (hash-based, no external lib)
    const hash = (x, y) => {
      const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return s - Math.floor(s);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const noise = (x, y) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const xf = x - xi;
      const yf = y - yi;
      const u = smooth(xf);
      const v = smooth(yf);
      const a = hash(xi, yi);
      const b = hash(xi + 1, yi);
      const c = hash(xi, yi + 1);
      const d = hash(xi + 1, yi + 1);
      return (
        a * (1 - u) * (1 - v) +
        b * u * (1 - v) +
        c * (1 - u) * v +
        d * u * v
      );
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (w === 0 || h === 0) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(w / CELL_W) + 1;
      rows = Math.ceil(h / CELL_H) + 1;
      cells = new Array(cols * rows);
      for (let i = 0; i < cells.length; i++) {
        cells[i] = {
          ci: (Math.random() * GL) | 0,
          alpha: Math.random() * 0.2,
        };
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let t0 = performance.now();
    let lastBroadFlip = t0;

    const draw = (now) => {
      const elapsed = now - t0;
      // Skip if not ready
      if (w === 0 || h === 0 || cells.length === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Clear fully — black below
      ctx.clearRect(0, 0, w, h);

      ctx.font = `9px 'JetBrains Mono', 'Geist Mono', ui-monospace, monospace`;
      ctx.textBaseline = "top";

      // Update wandering bright spots
      if (!reducedMotion.current) {
        for (const s of spots) {
          s.x += s.vx * elapsed;
          s.y += s.vy * elapsed;
          // Bounce
          if (s.x < 0 || s.x > 1) s.vx *= -1;
          if (s.y < 0 || s.y > 1) s.vy *= -1;
          s.x = Math.max(0, Math.min(1, s.x));
          s.y = Math.max(0, Math.min(1, s.y));
        }
      }
      t0 = now;

      const timeScale = now * 0.00012;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const cell = cells[idx];
          if (!cell) continue;

          const nx = c / cols;
          const ny = r / rows;

          // Multi-octave noise for the "flowing turbulence" base
          const n1 = noise(c * 0.08 + timeScale * 4, r * 0.08 - timeScale * 3);
          const n2 = noise(c * 0.18 - timeScale * 6, r * 0.18 + timeScale * 5) * 0.5;
          const n = (n1 + n2) / 1.5; // 0..1

          // Bright spot contribution
          let spotBoost = 0;
          for (const s of spots) {
            const dx = nx - s.x;
            const dy = ny - s.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < s.radius) {
              const falloff = 1 - d / s.radius;
              spotBoost += falloff * falloff * s.intensity;
            }
          }

          // Combine: noise gives base texture (0.05..0.45), spots add 0..0.4 on top
          // Some cells go near-invisible, others punch bright
          let alpha = 0.03 + n * 0.42 + spotBoost;
          // Occasional "hot pixels" for the vivid sparkle
          if ((idx + ((now * 0.0005) | 0)) % 97 === 0) {
            alpha = Math.min(0.95, alpha + 0.4);
          }
          if (alpha > 0.95) alpha = 0.95;

          // Ease
          cell.alpha += (alpha - cell.alpha) * 0.12;

          if (cell.alpha > 0.02) {
            ctx.fillStyle = `rgba(0, 188, 212, ${cell.alpha.toFixed(3)})`;
            ctx.fillText(GLYPHS[cell.ci], c * CELL_W, r * CELL_H);
          }
        }
      }

      // Broad char refresh — ~5% of cells re-pick a glyph every ~400ms
      if (!reducedMotion.current && now - lastBroadFlip > 400) {
        lastBroadFlip = now;
        const flipCount = Math.floor(cells.length * 0.05);
        for (let k = 0; k < flipCount; k++) {
          const idx = (Math.random() * cells.length) | 0;
          if (cells[idx]) cells[idx].ci = (Math.random() * GL) | 0;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
      } else {
        t0 = performance.now();
        rafRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      mql.removeEventListener?.("change", onMql);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}

// ============================================================================
// Top bar
// ============================================================================
function TopBar({ project }) {
  return (
    <header
      style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(0, 0, 0, 0.88)",
        flexShrink: 0,
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: C.tealDeep,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT.mono,
            fontSize: 12,
            fontWeight: 700,
            color: C.text,
            flexShrink: 0,
          }}
        >
          a
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontFamily: FONT.sans,
              fontSize: 14,
              fontWeight: 600,
              color: C.text,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            agent<span style={{ color: C.textDim, fontWeight: 400 }}>knowledge</span>workers
          </span>
          <span className="topbar-slash" style={{ color: C.textMute, fontFamily: FONT.mono, fontSize: 12 }}>
            /
          </span>
          <span
            className="topbar-repo"
            style={{
              color: C.textDim,
              fontFamily: FONT.mono,
              fontSize: 12,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 280,
            }}
          >
            {project.repo}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span
          className="topbar-status"
          style={{
            fontFamily: FONT.mono,
            fontSize: 11,
            color: C.textDim,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: statusColor(project.status),
            }}
          />
          {statusLabel(project.status)}
        </span>
        <a
          href={`https://github.com/${project.repo}`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 5,
            border: `1px solid ${C.borderHi}`,
            background: C.surface,
            color: C.text,
            fontFamily: FONT.sans,
            fontSize: 12.5,
            fontWeight: 500,
            textDecoration: "none",
            transition: "all 150ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = C.surfaceHi;
            e.currentTarget.style.borderColor = C.teal;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = C.surface;
            e.currentTarget.style.borderColor = C.borderHi;
          }}
        >
          <Github size={13} />
          <span className="topbar-github-label">View on GitHub</span>
          <ArrowUpRight size={12} />
        </a>
      </div>
    </header>
  );
}

// ============================================================================
// Left nav — projects
// ============================================================================
function ProjectNav({ selectedId, onSelect }) {
  return (
    <aside
      className="project-nav"
      style={{
        position: "relative",
        zIndex: 1,
        width: 240,
        flexShrink: 0,
        borderRight: `1px solid ${C.border}`,
        background: "rgba(0, 0, 0, 0.88)",
        overflowY: "auto",
        padding: "14px 0",
      }}
    >
      <div
        style={{
          padding: "0 20px 10px",
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.textMute,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Projects</span>
        <span>{PROJECTS.length}</span>
      </div>

      {PROJECTS.map((p) => {
        const active = selectedId === p.id;
        const sc = statusColor(p.status);
        const pct = Math.round((p.summary.done / p.summary.issues) * 100);
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              display: "block",
              width: "100%",
              padding: "10px 18px 10px 20px",
              border: "none",
              borderLeft: `2px solid ${active ? C.teal : "transparent"}`,
              background: active ? C.surface : "transparent",
              color: active ? C.text : C.textDim,
              fontFamily: FONT.sans,
              textAlign: "left",
              cursor: "pointer",
              transition: "background 120ms, color 120ms",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = C.surface;
                e.currentTarget.style.color = C.text;
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = C.textDim;
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: sc,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 12,
                  fontWeight: 500,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
              </span>
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  color: C.textMute,
                }}
              >
                {pct}%
              </span>
            </div>
            <div
              style={{
                paddingLeft: 14,
              }}
            >
              <span
                style={{
                  display: "block",
                  width: "100%",
                  height: 2,
                  background: C.border,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: `${pct}%`,
                    height: "100%",
                    background: C.teal,
                    transition: "width 300ms",
                  }}
                />
              </span>
            </div>
          </button>
        );
      })}
    </aside>
  );
}

// ============================================================================
// Center canvas — nested tree: Milestone → Issue → Task
// ============================================================================
function TreeCanvas({ project, detail, selection, onSelect }) {
  const [expanded, setExpanded] = useState(() => {
    // Default: expand first milestone + its first issue
    const init = new Set();
    if (detail.milestones[0]) {
      init.add(`m-${detail.milestones[0].id}`);
      if (detail.milestones[0].issues[0]) {
        init.add(`i-${detail.milestones[0].issues[0].id}`);
      }
    }
    return init;
  });

  const toggle = (key) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const isSelected = (kind, id) => selection.kind === kind && selection.id === id;

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Section header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 11,
              color: C.textMute,
              letterSpacing: "0.08em",
            }}
          >
            01
          </span>
          <h1
            style={{
              fontFamily: FONT.sans,
              fontSize: 19,
              fontWeight: 500,
              color: C.text,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {project.name}
          </h1>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 11,
              color: statusColor(project.status),
            }}
          >
            {statusLabel(project.status)}
          </span>
        </div>
        <p
          style={{
            fontFamily: FONT.sans,
            fontSize: 12.5,
            color: C.textDim,
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 760,
          }}
        >
          {project.description}
        </p>
      </div>

      {/* Summary row */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
          padding: "0 4px",
        }}
      >
        {[
          { label: "Milestones", value: project.summary.milestones },
          { label: "Issues", value: project.summary.issues },
          { label: "Tasks", value: project.summary.tasks },
          { label: "Done", value: `${project.summary.done}/${project.summary.issues}` },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.textMute, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {s.label}
            </span>
            <span style={{ fontFamily: FONT.mono, fontSize: 15, color: C.text, fontWeight: 500 }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Tree section label */}
      <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "baseline", gap: 12, flexShrink: 0 }}>
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: 11,
            color: C.textMute,
            letterSpacing: "0.08em",
          }}
        >
          02
        </span>
        <h2
          style={{
            fontFamily: FONT.sans,
            fontSize: 14,
            fontWeight: 500,
            color: C.text,
            margin: 0,
            letterSpacing: "-0.005em",
          }}
        >
          Milestones · Issues · Tasks
        </h2>
        <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.textMute, marginLeft: "auto" }}>
          dogfooded · synced from GitHub
        </span>
      </div>

      {/* Tree */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 20px 20px",
        }}
      >
        {detail.milestones.map((m) => {
          const mKey = `m-${m.id}`;
          const mOpen = expanded.has(mKey);
          const mSelected = isSelected("milestone", m.id);
          return (
            <div key={m.id} style={{ marginBottom: 4 }}>
              {/* Milestone row */}
              <div
                onClick={() => {
                  toggle(mKey);
                  onSelect({ kind: "milestone", id: m.id });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 4,
                  border: `1px solid ${mSelected ? C.teal : C.border}`,
                  background: C.surface,
                  cursor: "pointer",
                  transition: "border-color 120ms, background 120ms",
                }}
                onMouseEnter={(e) => {
                  if (!mSelected) e.currentTarget.style.background = C.surfaceHi;
                }}
                onMouseLeave={(e) => {
                  if (!mSelected) e.currentTarget.style.background = C.surface;
                }}
              >
                {mOpen ? <ChevronDown size={14} color={C.teal} /> : <ChevronRight size={14} color={C.textDim} />}
                <Flag size={12} color={C.teal} />
                <span style={{ fontFamily: FONT.sans, fontSize: 13, color: C.text, fontWeight: 500, flex: 1 }}>
                  {m.title}
                </span>
                <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.textMute }}>
                  due {m.dueOn}
                </span>
                <ProgressBar pct={m.pct} />
                <span
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 10.5,
                    color: statusColor(m.status),
                    minWidth: 78,
                    textAlign: "right",
                  }}
                >
                  {statusLabel(m.status)}
                </span>
              </div>

              {/* Issues */}
              {mOpen && (
                <div style={{ marginLeft: 18, marginTop: 3, borderLeft: `1px dashed ${C.border}`, paddingLeft: 12 }}>
                  {m.issues.map((iss) => {
                    const iKey = `i-${iss.id}`;
                    const iOpen = expanded.has(iKey);
                    const iSelected = isSelected("issue", iss.id);
                    return (
                      <div key={iss.id} style={{ marginTop: 4 }}>
                        <div
                          onClick={() => {
                            toggle(iKey);
                            onSelect({ kind: "issue", id: iss.id });
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            borderRadius: 4,
                            border: `1px solid ${iSelected ? C.teal : "transparent"}`,
                            background: "transparent",
                            cursor: "pointer",
                            transition: "background 120ms, border-color 120ms",
                          }}
                          onMouseEnter={(e) => {
                            if (!iSelected) e.currentTarget.style.background = C.surfaceRow;
                          }}
                          onMouseLeave={(e) => {
                            if (!iSelected) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {iOpen ? <ChevronDown size={12} color={C.teal} /> : <ChevronRight size={12} color={C.textDim} />}
                          {iss.state === "closed" ? (
                            <Check size={11} color={C.tealHi} />
                          ) : (
                            <CircleDot size={11} color={C.teal} />
                          )}
                          <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.textMute, width: 32 }}>
                            #{iss.id}
                          </span>
                          <span style={{ fontFamily: FONT.sans, fontSize: 12.5, color: C.text, flex: 1 }}>
                            {iss.title}
                          </span>
                          {iss.pr && (
                            <span
                              style={{
                                fontFamily: FONT.mono,
                                fontSize: 10.5,
                                color: C.teal,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <GitPullRequest size={10} />
                              {iss.pr}
                            </span>
                          )}
                          <span
                            style={{
                              fontFamily: FONT.mono,
                              fontSize: 10.5,
                              color: C.textDim,
                            }}
                          >
                            {iss.sprint}
                          </span>
                        </div>

                        {/* Tasks */}
                        {iOpen && iss.tasks.length > 0 && (
                          <div style={{ marginLeft: 26, borderLeft: `1px dashed ${C.border}`, paddingLeft: 12 }}>
                            {iss.tasks.map((t) => {
                              const tSelected = isSelected("task", t.id);
                              const sc = statusColor(t.status);
                              return (
                                <div
                                  key={t.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect({ kind: "task", id: t.id });
                                  }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "6px 10px",
                                    borderRadius: 4,
                                    border: `1px solid ${tSelected ? C.teal : "transparent"}`,
                                    background: "transparent",
                                    cursor: "pointer",
                                    transition: "background 120ms, border-color 120ms",
                                    marginTop: 2,
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!tSelected) e.currentTarget.style.background = C.surfaceRow;
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!tSelected) e.currentTarget.style.background = "transparent";
                                  }}
                                >
                                  {t.status === "completed" ? (
                                    <Check size={10} color={C.tealHi} />
                                  ) : t.status === "in_progress" ? (
                                    <Clock size={10} color={C.teal} />
                                  ) : (
                                    <Circle size={10} color={C.textMute} />
                                  )}
                                  <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.textMute, width: 52 }}>
                                    {t.id}
                                  </span>
                                  <span style={{ fontFamily: FONT.sans, fontSize: 12, color: C.text, flex: 1 }}>
                                    {t.title}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: FONT.mono,
                                      fontSize: 9.5,
                                      color: C.textDim,
                                    }}
                                  >
                                    {t.tool}
                                  </span>
                                  <span style={{ fontFamily: FONT.mono, fontSize: 10, color: sc, minWidth: 70, textAlign: "right" }}>
                                    {statusLabel(t.status)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressBar({ pct }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: 120,
      }}
    >
      <div
        style={{
          flex: 1,
          height: 2,
          background: C.border,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: pct === 100 ? C.tealHi : C.teal,
            transition: "width 300ms",
          }}
        />
      </div>
      <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.textDim, minWidth: 30, textAlign: "right" }}>
        {pct}%
      </span>
    </div>
  );
}

// ============================================================================
// Right detail panel — contextual by selection kind
// ============================================================================
function DetailPanel({ selection, project, detail }) {
  // Resolve the selected entity
  const resolved = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === "project") return { kind: "project", data: project };
    for (const m of detail.milestones) {
      if (selection.kind === "milestone" && m.id === selection.id) {
        return { kind: "milestone", data: m };
      }
      for (const iss of m.issues) {
        if (selection.kind === "issue" && iss.id === selection.id) {
          return { kind: "issue", data: iss, parent: m };
        }
        for (const t of iss.tasks) {
          if (selection.kind === "task" && t.id === selection.id) {
            return { kind: "task", data: t, parent: iss, grandparent: m };
          }
        }
      }
    }
    return null;
  }, [selection, project, detail]);

  if (!resolved) {
    return (
      <aside
        className="detail-panel"
        style={{
          width: 320,
          flexShrink: 0,
          borderLeft: `1px solid ${C.border}`,
          background: C.bg,
          padding: "20px",
          fontFamily: FONT.sans,
          fontSize: 12,
          color: C.textMute,
        }}
      >
        Select a milestone, issue, or task to inspect.
      </aside>
    );
  }

  return (
    <aside
      className="detail-panel"
      style={{
        width: 320,
        flexShrink: 0,
        borderLeft: `1px solid ${C.border}`,
        background: C.bg,
        overflowY: "auto",
        padding: "20px",
      }}
    >
      {resolved.kind === "task" && <TaskDetail task={resolved.data} issue={resolved.parent} milestone={resolved.grandparent} />}
      {resolved.kind === "issue" && <IssueDetail issue={resolved.data} milestone={resolved.parent} />}
      {resolved.kind === "milestone" && <MilestoneDetail milestone={resolved.data} />}
      {resolved.kind === "project" && <ProjectDetail project={resolved.data} />}
    </aside>
  );
}

function DetailHeader({ kind, title, subtitle }) {
  return (
    <>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.textMute,
          marginBottom: 6,
        }}
      >
        {kind}
      </div>
      <div
        style={{
          fontFamily: FONT.sans,
          fontSize: 17,
          fontWeight: 500,
          color: C.text,
          letterSpacing: "-0.01em",
          marginBottom: subtitle ? 4 : 14,
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.textDim, marginBottom: 14 }}>
          {subtitle}
        </div>
      )}
    </>
  );
}

function MetaRow({ k, v, vColor }) {
  return (
    <>
      <span style={{ color: C.textMute }}>{k}</span>
      <span style={{ color: vColor || C.text }}>{v}</span>
    </>
  );
}

function TaskDetail({ task, issue, milestone }) {
  const sc = statusColor(task.status);
  return (
    <div>
      <DetailHeader kind={`task · ${task.tool}`} title={task.title} subtitle={task.id} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "8px 14px",
          fontFamily: FONT.mono,
          fontSize: 11.5,
          paddingBottom: 14,
          borderBottom: `1px solid ${C.border}`,
          marginBottom: 14,
        }}
      >
        <MetaRow k="status" v={statusLabel(task.status)} vColor={sc} />
        <MetaRow k="tool" v={task.tool} />
        <MetaRow k="sprint" v={task.sprint} />
        <MetaRow k="parent" v={`#${issue.id}`} />
        <MetaRow k="milestone" v={milestone.title} />
      </div>

      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.textMute,
          marginBottom: 8,
        }}
      >
        canonical claude-code task
      </div>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 11,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: 12,
          color: C.textDim,
          lineHeight: 1.6,
        }}
      >
        <div><span style={{ color: C.teal }}>$</span> claude tasks get {task.id}</div>
        <div style={{ height: 6 }} />
        <div>
          <span style={{ color: C.textMute }}>{"{"}</span>
        </div>
        <div style={{ paddingLeft: 12 }}>
          <span style={{ color: C.tealLo }}>"id"</span>: <span style={{ color: C.text }}>"{task.id}"</span>,
        </div>
        <div style={{ paddingLeft: 12 }}>
          <span style={{ color: C.tealLo }}>"status"</span>: <span style={{ color: sc }}>"{task.status}"</span>,
        </div>
        <div style={{ paddingLeft: 12 }}>
          <span style={{ color: C.tealLo }}>"tool"</span>: <span style={{ color: C.text }}>"{task.tool}"</span>,
        </div>
        <div style={{ paddingLeft: 12 }}>
          <span style={{ color: C.tealLo }}>"issue"</span>: <span style={{ color: C.text }}>{issue.id}</span>
        </div>
        <div><span style={{ color: C.textMute }}>{"}"}</span></div>
      </div>

      <div
        style={{
          marginTop: 14,
          fontFamily: FONT.sans,
          fontSize: 12,
          lineHeight: 1.55,
          color: C.textDim,
          padding: 12,
          borderRadius: 4,
          background: C.surface,
          border: `1px solid ${C.border}`,
        }}
      >
        Created by <code style={{ fontFamily: FONT.mono, color: C.tealHi }}>product-management-cli /sprint-planning</code> when issue #{issue.id} was decomposed. Progresses through <code style={{ fontFamily: FONT.mono, color: C.tealHi }}>TaskUpdate</code> as work completes.
      </div>
    </div>
  );
}

function IssueDetail({ issue, milestone }) {
  const done = issue.tasks.filter((t) => t.status === "completed").length;
  const pct = issue.tasks.length ? Math.round((done / issue.tasks.length) * 100) : 0;
  return (
    <div>
      <DetailHeader kind={`issue · #${issue.id}`} title={issue.title} subtitle={`${milestone.title} · ${issue.sprint}`} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "8px 14px",
          fontFamily: FONT.mono,
          fontSize: 11.5,
          paddingBottom: 14,
          borderBottom: `1px solid ${C.border}`,
          marginBottom: 14,
        }}
      >
        <MetaRow k="state" v={statusLabel(issue.state)} vColor={statusColor(issue.state)} />
        <MetaRow k="sprint" v={issue.sprint} />
        <MetaRow k="tasks" v={`${done}/${issue.tasks.length} done`} />
        <MetaRow k="milestone" v={milestone.title} />
        {issue.pr && <MetaRow k="pr" v={issue.pr} vColor={C.teal} />}
      </div>

      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.textMute,
          marginBottom: 8,
        }}
      >
        progress
      </div>
      <ProgressBar pct={pct} />

      <div
        style={{
          marginTop: 16,
          fontFamily: FONT.sans,
          fontSize: 12,
          lineHeight: 1.55,
          color: C.textDim,
          padding: 12,
          borderRadius: 4,
          background: C.surface,
          border: `1px solid ${C.border}`,
        }}
      >
        Issues decompose into canonical Claude Code tasks via <code style={{ fontFamily: FONT.mono, color: C.tealHi }}>/sprint-planning</code>. Closing this issue requires every child task to reach <code style={{ fontFamily: FONT.mono, color: C.tealHi }}>completed</code>.
      </div>
    </div>
  );
}

function MilestoneDetail({ milestone }) {
  const totalIssues = milestone.issues.length;
  const closedIssues = milestone.issues.filter((i) => i.state === "closed").length;
  const totalTasks = milestone.issues.reduce((acc, i) => acc + i.tasks.length, 0);
  const doneTasks = milestone.issues.reduce(
    (acc, i) => acc + i.tasks.filter((t) => t.status === "completed").length,
    0
  );
  return (
    <div>
      <DetailHeader kind={`milestone · ${milestone.id}`} title={milestone.title} subtitle={`due ${milestone.dueOn}`} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "8px 14px",
          fontFamily: FONT.mono,
          fontSize: 11.5,
          paddingBottom: 14,
          borderBottom: `1px solid ${C.border}`,
          marginBottom: 14,
        }}
      >
        <MetaRow k="status" v={statusLabel(milestone.status)} vColor={statusColor(milestone.status)} />
        <MetaRow k="due" v={milestone.dueOn} />
        <MetaRow k="issues" v={`${closedIssues}/${totalIssues} closed`} />
        <MetaRow k="tasks" v={`${doneTasks}/${totalTasks} done`} />
        <MetaRow k="progress" v={`${milestone.pct}%`} vColor={C.tealHi} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <ProgressBar pct={milestone.pct} />
      </div>

      <div
        style={{
          marginTop: 16,
          fontFamily: FONT.sans,
          fontSize: 12,
          lineHeight: 1.55,
          color: C.textDim,
          padding: 12,
          borderRadius: 4,
          background: C.surface,
          border: `1px solid ${C.border}`,
        }}
      >
        Milestones auto-close when every child issue closes. GitHub webhooks trigger release-please on close — producing versioned packages under <code style={{ fontFamily: FONT.mono, color: C.tealHi }}>@agentknowledgeworkers</code>.
      </div>
    </div>
  );
}

function ProjectDetail({ project }) {
  return (
    <div>
      <DetailHeader kind="project" title={project.name} subtitle={project.repo} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "8px 14px",
          fontFamily: FONT.mono,
          fontSize: 11.5,
          paddingBottom: 14,
          borderBottom: `1px solid ${C.border}`,
          marginBottom: 14,
        }}
      >
        <MetaRow k="status" v={statusLabel(project.status)} vColor={statusColor(project.status)} />
        <MetaRow k="start" v={project.startDate} />
        <MetaRow k="target" v={project.targetDate} />
        <MetaRow k="milestones" v={project.summary.milestones} />
        <MetaRow k="issues" v={project.summary.issues} />
        <MetaRow k="tasks" v={project.summary.tasks} />
      </div>
      <div style={{ fontFamily: FONT.sans, fontSize: 12.5, color: C.textDim, lineHeight: 1.55 }}>
        {project.description}
      </div>
    </div>
  );
}

// ============================================================================
// App
// ============================================================================
export default function App() {
  const [selectedProjectId, setSelectedProjectId] = useState("akw-site");
  const [selection, setSelection] = useState({ kind: "milestone", id: "M1" });

  const project = PROJECTS.find((p) => p.id === selectedProjectId) || PROJECTS[0];
  const detail = PROJECT_DETAIL[project.id] || defaultDetail(project);

  const handleProjectSelect = (id) => {
    setSelectedProjectId(id);
    const d = PROJECT_DETAIL[id] || defaultDetail(PROJECTS.find((p) => p.id === id));
    setSelection({ kind: "milestone", id: d.milestones[0]?.id });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: C.bg,
        color: C.text,
        fontFamily: FONT.sans,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        code { font-family: ${FONT.mono}; }
        ::selection { background: ${C.teal}; color: ${C.bg}; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.borderHi}; }
        @media (max-width: 640px) {
          .project-nav { display: none !important; }
          .detail-panel { display: none !important; }
          .topbar-slash, .topbar-repo, .topbar-status, .topbar-github-label { display: none !important; }
        }
        @media (max-width: 900px) {
          .detail-panel { display: none !important; }
        }
      `}</style>

      <TopBar project={project} />

      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        <BrailleField />

        <ProjectNav selectedId={selectedProjectId} onSelect={handleProjectSelect} />

        <main
          style={{
            position: "relative",
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <TreeCanvas project={project} detail={detail} selection={selection} onSelect={setSelection} />
        </main>

        <DetailPanel selection={selection} project={project} detail={detail} />
      </div>
    </div>
  );
}
