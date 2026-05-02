/* ============================================================
   ADR + Changelog routes
   ============================================================ */

/* Tiny markdown renderer — covers headings, lists, paragraphs,
   inline code, bold, links, hr, blockquote. No deps. */
function renderInline(s) {
  // escape HTML
  let out = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return out;
}

function renderMarkdown(md) {
  const lines = md.split("\n");
  const blocks = [];
  let para = [], list = null, bq = [];

  const flushPara = () => { if (para.length) { blocks.push({ t: "p", c: para.join(" ") }); para = []; } };
  const flushList = () => { if (list) { blocks.push({ t: list.kind, items: list.items }); list = null; } };
  const flushBq   = () => { if (bq.length) { blocks.push({ t: "bq", c: bq.join(" ") }); bq = []; } };

  for (const raw of lines) {
    const ln = raw.trimEnd();
    if (!ln.trim()) { flushPara(); flushList(); flushBq(); continue; }
    let m;
    if ((m = ln.match(/^(#{1,3})\s+(.*)/))) { flushPara(); flushList(); flushBq(); blocks.push({ t: `h${m[1].length}`, c: m[2] }); continue; }
    if (ln.match(/^---+$/))                  { flushPara(); flushList(); flushBq(); blocks.push({ t: "hr" }); continue; }
    if ((m = ln.match(/^>\s?(.*)/)))         { flushPara(); flushList(); bq.push(m[1]); continue; }
    if ((m = ln.match(/^\s*[-*]\s+(.*)/))) {
      flushPara(); flushBq();
      if (!list || list.kind !== "ul") { flushList(); list = { kind: "ul", items: [] }; }
      list.items.push(m[1]); continue;
    }
    if ((m = ln.match(/^\s*\d+\.\s+(.*)/))) {
      flushPara(); flushBq();
      if (!list || list.kind !== "ol") { flushList(); list = { kind: "ol", items: [] }; }
      list.items.push(m[1]); continue;
    }
    flushList(); flushBq(); para.push(ln);
  }
  flushPara(); flushList(); flushBq();

  return blocks.map((b, i) => {
    if (b.t === "p")  return <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(b.c) }} />;
    if (b.t === "h1") return <h1 key={i} dangerouslySetInnerHTML={{ __html: renderInline(b.c) }} />;
    if (b.t === "h2") return <h2 key={i} dangerouslySetInnerHTML={{ __html: renderInline(b.c) }} />;
    if (b.t === "h3") return <h3 key={i} dangerouslySetInnerHTML={{ __html: renderInline(b.c) }} />;
    if (b.t === "hr") return <hr key={i} />;
    if (b.t === "bq") return <blockquote key={i} dangerouslySetInnerHTML={{ __html: renderInline(b.c) }} />;
    if (b.t === "ul") return <ul key={i}>{b.items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />)}</ul>;
    if (b.t === "ol") return <ol key={i}>{b.items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />)}</ol>;
    return null;
  });
}

const AdrRoute = () => {
  const [activeNum, setActiveNum] = React.useState(window.ADRS[0].number);
  const adr = window.ADRS.find((a) => a.number === activeNum) || window.ADRS[0];

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-section">
          <span className="sc">Decisions</span>
          <span className="sc">{window.ADRS.length}</span>
        </div>
        {window.ADRS.map((a) => (
          <button
            key={a.number}
            className={`rail-item ${a.number === activeNum ? "is-active" : ""}`}
            onClick={() => setActiveNum(a.number)}
          >
            <div className="rail-item-row">
              <span className="rail-item-name">ADR-{a.number}</span>
              <span className="rail-item-pct" style={{ color: a.status === "Accepted" ? "var(--status-done)" : "var(--accent)" }}>
                {a.status === "Accepted" ? "✓" : "·"}
              </span>
            </div>
            <div style={{ paddingLeft: 0, fontSize: "var(--fs-12)", color: "var(--fg-muted)", lineHeight: 1.35, paddingRight: "var(--sp-3)" }}>
              {a.title}
            </div>
          </button>
        ))}
      </aside>

      <main className="center">
        <div className="center-header">
          <div className="center-eyebrow">
            <span className="center-num">03</span>
            <h1 className="center-title">Architectural Decision Records</h1>
            <span className="center-status">{window.ADRS.length} total</span>
          </div>
          <p className="center-desc">
            Major decisions, dated and durable. Every ADR includes context, the decision, and the consequences we accept.
          </p>
        </div>

        <article className="md">
          <div className="md-eyebrow">
            ADR-{adr.number} · {adr.status} · {adr.date}
          </div>
          {renderMarkdown(adr.body)}
        </article>
      </main>

      <aside className="rail-r">
        <div className="detail-eyebrow">Metadata</div>
        <h2 className="detail-title">ADR-{adr.number}</h2>
        <div className="detail-kv">
          <span className="k">title</span><span className="v">{adr.title}</span>
          <span className="k">status</span>
          <span className={`v ${adr.status === "Accepted" ? "green" : "accent"}`}>{adr.status.toLowerCase()}</span>
          <span className="k">date</span><span className="v">{adr.date}</span>
          <span className="k">number</span><span className="v">{adr.number}</span>
        </div>
        <div className="detail-eyebrow">Index</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {window.ADRS.map((a) => (
            <button
              key={a.number}
              onClick={() => setActiveNum(a.number)}
              style={{
                textAlign: "left",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--fs-11)",
                color: a.number === activeNum ? "var(--accent)" : "var(--fg-muted)",
                padding: "2px 0",
              }}
            >
              {a.number} · {a.title}
            </button>
          ))}
        </div>
        <p className="detail-notes">
          ADRs live in <code>meta-repo/docs/adr/</code>. Open a PR to propose; merge to accept.
        </p>
      </aside>
    </div>
  );
};

const ChangelogRoute = () => {
  const [pluginFilter, setPluginFilter] = React.useState("all");

  const entries = window.CHANGELOG.map((e) => ({
    ...e,
    items: pluginFilter === "all" ? e.items : e.items.filter((it) => it.plugin === pluginFilter),
  })).filter((e) => e.items.length > 0);

  return (
    <div className="shell shell--2col">
      <main className="center">
        <div className="center-header">
          <div className="center-eyebrow">
            <span className="center-num">04</span>
            <h1 className="center-title">Changelog</h1>
            <span className="center-status">reverse-chrono</span>
          </div>
          <p className="center-desc">
            Combined release notes across all eight plugins. Filter by plugin in the right rail.
          </p>
        </div>

        <div className="cl-list">
          {entries.map((e) => (
            <div key={e.version} className="cl-entry">
              <div className="cl-when">
                {e.date}
                <span className="cl-version">{e.version}</span>
              </div>
              <div className="cl-body">
                <h3>{e.version} · {e.items.length} change{e.items.length === 1 ? "" : "s"}</h3>
                <ul>
                  {e.items.map((it, i) => (
                    <li key={i}>
                      <span className="cl-tag" data-kind={it.kind}>{it.kind}</span>
                      <span className="mono" style={{ color: "var(--fg-muted)", fontSize: "var(--fs-11)", marginRight: 8 }}>
                        {window.PLUGIN_LABEL[it.plugin]}
                      </span>
                      {it.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>

      <aside className="rail-r">
        <div className="detail-eyebrow">Filter</div>
        <h2 className="detail-title">Plugins</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: "var(--sp-5)" }}>
          <button
            onClick={() => setPluginFilter("all")}
            style={{
              textAlign: "left",
              padding: "4px 0",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-12)",
              color: pluginFilter === "all" ? "var(--accent)" : "var(--fg)",
            }}
          >
            all plugins
          </button>
          {window.PLUGINS.map((p) => (
            <button
              key={p}
              onClick={() => setPluginFilter(p)}
              style={{
                textAlign: "left",
                padding: "4px 0",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--fs-12)",
                color: pluginFilter === p ? "var(--accent)" : "var(--fg-muted)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ display: "inline-block", width: 6, height: 6, background: `var(--plug-${p})` }} />
              {window.PLUGIN_LABEL[p]}
            </button>
          ))}
        </div>

        <div className="detail-eyebrow">Versions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: "var(--sp-5)" }}>
          {window.CHANGELOG.map((e) => (
            <div key={e.version} style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-11)",
              color: "var(--fg-muted)",
              display: "flex",
              justifyContent: "space-between",
            }}>
              <span style={{ color: "var(--fg)" }}>{e.version}</span>
              <span>{e.date}</span>
            </div>
          ))}
        </div>

        <p className="detail-notes">
          Generated from PR titles + commit trailers via <code>engineering-cli changelog --since v0.5.0</code>.
        </p>
      </aside>
    </div>
  );
};

window.AdrRoute = AdrRoute;
window.ChangelogRoute = ChangelogRoute;
