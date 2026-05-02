/* ============================================================
   Plugins route — 3-col: rail (plugin list w/ velocity %),
   center (milestones tree), right (selected milestone detail)
   ============================================================ */

const STATUS_LABEL = {
  completed: "completed",
  in_progress: "in progress",
  queued: "queued",
  pending: "pending",
  closed: "closed",
  open: "open",
};

const Caret = ({ open }) => (
  <span className="row-caret">{open ? "▾" : "▸"}</span>
);

const StatusGlyph = ({ s }) => {
  // "completed" / "closed" → filled square; "in_progress" → half; else → ring
  if (s === "completed" || s === "closed") {
    return <span className="row-icon" style={{ color: "var(--status-done)", fontSize: 11 }}>■</span>;
  }
  if (s === "in_progress") {
    return <span className="row-icon" style={{ color: "var(--accent)", fontSize: 11 }}>◐</span>;
  }
  return <span className="row-icon" style={{ color: "var(--fg-faint)", fontSize: 11 }}>○</span>;
};

const Tree = ({ detail, selection, onSelect }) => {
  const [open, setOpen] = React.useState(() => {
    const s = new Set();
    if (detail.milestones[0]) {
      s.add(`m-${detail.milestones[0].id}`);
      if (detail.milestones[0].issues[0]) s.add(`i-${detail.milestones[0].issues[0].id}`);
    }
    return s;
  });
  const toggle = (k) => setOpen((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const isSel = (kind, id) => selection && selection.kind === kind && selection.id === id;

  return (
    <div className="tree">
      {detail.milestones.map((m) => {
        const mk = `m-${m.id}`, mOpen = open.has(mk), mSel = isSel("milestone", m.id);
        return (
          <div key={m.id}>
            <div
              className={`row row--milestone ${mOpen ? "is-open" : ""} ${mSel ? "is-selected" : ""}`}
              onClick={() => { toggle(mk); onSelect({ kind: "milestone", id: m.id }); }}
            >
              <Caret open={mOpen} />
              <StatusGlyph s={m.status} />
              <span className="row-id">{m.id}</span>
              <span className="row-title">{m.title}</span>
              <span className="row-meta">due {m.due}</span>
              <span className="bar-mini"><span style={{ width: `${m.pct}%` }} /></span>
              <span className="row-status" data-s={m.status}>{STATUS_LABEL[m.status] || m.status}</span>
            </div>

            {mOpen && (
              <div className="children">
                {m.issues.length === 0 && <div className="row" style={{cursor:"default"}}><span className="row-meta">— no issues —</span></div>}
                {m.issues.map((iss) => {
                  const ik = `i-${iss.id}`, iOpen = open.has(ik), iSel = isSel("issue", iss.id);
                  return (
                    <div key={iss.id}>
                      <div
                        className={`row ${iOpen ? "is-open" : ""} ${iSel ? "is-selected" : ""}`}
                        onClick={() => { toggle(ik); onSelect({ kind: "issue", id: iss.id }); }}
                      >
                        <Caret open={iOpen} />
                        <StatusGlyph s={iss.state} />
                        <span className="row-id">#{iss.id}</span>
                        <span className="row-title">{iss.title}</span>
                        {iss.pr && <span className="row-meta" style={{ color: "var(--accent)" }}>{iss.pr}</span>}
                        <span className="row-meta">{iss.sprint}</span>
                        <span className="row-status" data-s={iss.state}>{STATUS_LABEL[iss.state] || iss.state}</span>
                      </div>
                      {iOpen && iss.tasks.length > 0 && (
                        <div className="children">
                          {iss.tasks.map((t) => {
                            const tSel = isSel("task", t.id);
                            return (
                              <div
                                key={t.id}
                                className={`row ${tSel ? "is-selected" : ""}`}
                                onClick={(e) => { e.stopPropagation(); onSelect({ kind: "task", id: t.id }); }}
                              >
                                <span className="row-caret"></span>
                                <StatusGlyph s={t.status} />
                                <span className="row-id">{t.id}</span>
                                <span className="row-title">{t.title}</span>
                                <span className="row-meta">{t.tool}</span>
                                <span className="row-status" data-s={t.status}>{STATUS_LABEL[t.status] || t.status}</span>
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
  );
};

const PluginRail = ({ activeId, onSelect }) => {
  return (
    <aside className="rail">
      <div className="rail-section">
        <span className="sc">Plugins</span>
        <span className="sc">{window.PLUGINS.length}</span>
      </div>
      {window.PLUGINS.map((p) => {
        const v = window.PLUGIN_VELOCITY[p];
        const active = activeId === p;
        const barPct = Math.min(100, v / 3.5); // visual scale only
        return (
          <button
            key={p}
            className={`rail-item ${active ? "is-active" : ""}`}
            onClick={() => onSelect(p)}
          >
            <div className="rail-item-row">
              <span style={{ display: "inline-block", width: 6, height: 6, background: `var(--plug-${p})`, flexShrink: 0 }} />
              <span className="rail-item-name">{window.PLUGIN_LABEL[p]}</span>
              <span className="rail-item-pct">{v}%</span>
            </div>
            <div className="rail-item-bar"><span style={{ width: `${barPct}%` }} /></div>
          </button>
        );
      })}
    </aside>
  );
};

const PluginDetailRail = ({ resolved, plugin }) => {
  if (!resolved) {
    return (
      <aside className="rail-r">
        <div className="detail-eyebrow">Plugin</div>
        <h2 className="detail-title">{window.PLUGIN_LABEL[plugin.id]}</h2>
        <div className="detail-kv">
          <span className="k">repo</span><span className="v">subagentorganizations/{plugin.id}</span>
          <span className="k">status</span><span className={`v ${plugin.detail.status === "completed" ? "green" : "accent"}`}>{STATUS_LABEL[plugin.detail.status] || plugin.detail.status}</span>
          <span className="k">target</span><span className="v">{plugin.detail.target}</span>
          <span className="k">milestones</span><span className="v">{plugin.detail.summary.milestones}</span>
          <span className="k">issues</span><span className="v">{plugin.detail.summary.issues}</span>
          <span className="k">tasks</span><span className="v">{plugin.detail.summary.tasks}</span>
          <span className="k">done</span><span className="v">{plugin.detail.summary.done}/{plugin.detail.summary.tasks}</span>
        </div>
        <p className="detail-notes">
          {plugin.detail.description} Select a milestone, issue, or task in the tree to inspect.
        </p>
      </aside>
    );
  }

  if (resolved.kind === "milestone") {
    const m = resolved.data;
    return (
      <aside className="rail-r">
        <div className="detail-eyebrow">Milestone · {m.id}</div>
        <h2 className="detail-title">{m.title}</h2>
        <div className="detail-kv">
          <span className="k">status</span>
          <span className={`v ${m.status === "completed" ? "green" : (m.status === "in_progress" ? "accent" : "")}`}>
            {STATUS_LABEL[m.status] || m.status}
          </span>
          <span className="k">due</span><span className="v">{m.due}</span>
          <span className="k">issues</span><span className="v">{m.issues.length}</span>
          <span className="k">tasks</span><span className="v">{m.issues.reduce((a, i) => a + i.tasks.length, 0)}</span>
          <span className="k">progress</span><span className="v accent">{m.pct}%</span>
        </div>
        <div className="detail-bar"><span style={{ width: `${m.pct}%` }} /></div>
        <div className="detail-bar-row">
          <span>{m.pct}% complete</span>
          <span style={{ marginLeft: "auto" }}>{m.issues.filter(i => i.state === "closed").length}/{m.issues.length} issues closed</span>
        </div>
        <p className="detail-notes">
          Closing this milestone requires every child issue to reach <code>closed</code> with all tasks <code>completed</code>.
        </p>
      </aside>
    );
  }

  if (resolved.kind === "issue") {
    const iss = resolved.data, parent = resolved.parent;
    const done = iss.tasks.filter((t) => t.status === "completed").length;
    const pct = iss.tasks.length ? Math.round((done / iss.tasks.length) * 100) : 0;
    return (
      <aside className="rail-r">
        <div className="detail-eyebrow">Issue · #{iss.id}</div>
        <h2 className="detail-title">{iss.title}</h2>
        <div className="detail-kv">
          <span className="k">state</span>
          <span className={`v ${iss.state === "closed" ? "green" : ""}`}>{STATUS_LABEL[iss.state] || iss.state}</span>
          <span className="k">milestone</span><span className="v">{parent.title}</span>
          <span className="k">sprint</span><span className="v">{iss.sprint}</span>
          <span className="k">tasks</span><span className="v">{done}/{iss.tasks.length} done</span>
          {iss.pr && (<><span className="k">pr</span><span className="v accent">{iss.pr}</span></>)}
        </div>
        <div className="detail-bar"><span style={{ width: `${pct}%` }} /></div>
        <p className="detail-notes">
          Issues decompose into canonical Claude Code tasks via <code>/sprint-planning</code>. Closing requires every task <code>completed</code>.
        </p>
      </aside>
    );
  }

  if (resolved.kind === "task") {
    const t = resolved.data, iss = resolved.parent, m = resolved.grandparent;
    return (
      <aside className="rail-r">
        <div className="detail-eyebrow">Task · {t.tool}</div>
        <h2 className="detail-title">{t.title}</h2>
        <div className="detail-kv">
          <span className="k">id</span><span className="v">{t.id}</span>
          <span className="k">status</span>
          <span className={`v ${t.status === "completed" ? "green" : (t.status === "in_progress" ? "accent" : "")}`}>
            {STATUS_LABEL[t.status] || t.status}
          </span>
          <span className="k">tool</span><span className="v">{t.tool}</span>
          <span className="k">issue</span><span className="v">#{iss.id}</span>
          <span className="k">milestone</span><span className="v">{m.title}</span>
        </div>
        <p className="detail-notes">
          Created by <code>product-management-cli /sprint-planning</code> when issue #{iss.id} was decomposed. Progresses through <code>TaskUpdate</code> as work completes.
        </p>
      </aside>
    );
  }

  return null;
};

const PluginsRoute = () => {
  const pluginsWithDetail = window.PLUGINS.filter((p) => window.PLUGIN_DETAIL[p]);
  const fallback = pluginsWithDetail[0] || window.PLUGINS[0];
  const [activeId, setActiveId] = React.useState(fallback);
  const [selection, setSelection] = React.useState(null);

  const detail = window.PLUGIN_DETAIL[activeId] || window.PLUGIN_DETAIL[fallback];
  const plugin = { id: activeId, detail };

  // Reset selection when plugin changes
  React.useEffect(() => { setSelection(null); }, [activeId]);

  const resolved = React.useMemo(() => {
    if (!selection) return null;
    for (const m of detail.milestones) {
      if (selection.kind === "milestone" && m.id === selection.id) return { kind: "milestone", data: m };
      for (const iss of m.issues) {
        if (selection.kind === "issue" && iss.id === selection.id) return { kind: "issue", data: iss, parent: m };
        for (const t of iss.tasks) {
          if (selection.kind === "task" && t.id === selection.id) return { kind: "task", data: t, parent: iss, grandparent: m };
        }
      }
    }
    return null;
  }, [selection, detail]);

  const totalDone = detail.milestones.reduce((a, m) => a + m.issues.filter(i => i.state === "closed").length, 0);
  const totalIssues = detail.summary.issues;

  return (
    <div className="shell">
      <PluginRail activeId={activeId} onSelect={setActiveId} />

      <main className="center">
        <div className="center-header">
          <div className="center-eyebrow">
            <span className="center-num">02</span>
            <h1 className="center-title">{window.PLUGIN_LABEL[activeId]}</h1>
            <span className="center-status" style={{ color: detail.status === "completed" ? "var(--status-done)" : "var(--accent)" }}>
              {STATUS_LABEL[detail.status]}
            </span>
          </div>
          <p className="center-desc">{detail.description}</p>
        </div>

        <div className="stats">
          <div className="stat"><span className="sc">Milestones</span><span className="stat-value">{detail.summary.milestones}</span></div>
          <div className="stat"><span className="sc">Issues</span><span className="stat-value">{detail.summary.issues}</span></div>
          <div className="stat"><span className="sc">Tasks</span><span className="stat-value">{detail.summary.tasks}</span></div>
          <div className="stat"><span className="sc">Done</span><span className="stat-value">{detail.summary.done}/{detail.summary.tasks}</span></div>
        </div>

        <div className="tree-section">
          <span className="center-num">02.1</span>
          <h2 style={{ fontSize: "var(--fs-14)", fontWeight: 500, margin: 0 }}>Milestones · Issues · Tasks</h2>
          <span className="sc">synced from GitHub · 14s ago</span>
        </div>

        <Tree detail={detail} selection={selection} onSelect={setSelection} />
      </main>

      <PluginDetailRail resolved={resolved} plugin={plugin} />
    </div>
  );
};

window.PluginsRoute = PluginsRoute;
