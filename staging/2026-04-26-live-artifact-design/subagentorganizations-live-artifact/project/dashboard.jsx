/* ============================================================
   Dashboard — dense kanban, plugin = left-border color, 30px rows
   ============================================================ */

const STATUS_COLS = ["Todo", "In Progress", "In Review", "Done"];
const STATUS_DOT = {
  "Todo":        "var(--status-todo)",
  "In Progress": "var(--status-in-progress)",
  "In Review":   "var(--status-in-review)",
  "Done":        "var(--status-done)",
  "Won't do":    "var(--status-wont)",
};

const IssueRow = ({ issue }) => (
  <button
    className="icard"
    style={{ "--plug": `var(--plug-${issue.plugin})` }}
    onClick={(e) => e.preventDefault()}
    title={`${issue.repo.split("/")[1]} #${issue.number} · ${issue.title}`}
  >
    <span className="icard-id">#{issue.number}</span>
    <span className="icard-title">{issue.title}</span>
    <span className="icard-prio" data-p={issue.priority}>{issue.priority}</span>
    {issue.assignee && <span className="icard-assignee">{issue.assignee}</span>}
  </button>
);

const Column = ({ status, issues }) => (
  <div className="col">
    <div className="col-header">
      <span className="col-dot" style={{ background: STATUS_DOT[status] }} />
      <span className="col-title">{status}</span>
      <span className="col-count">{issues.length}</span>
    </div>
    <div className="col-body">
      {issues.length === 0
        ? <div className="col-empty">— empty —</div>
        : issues.map((iss) => <IssueRow key={iss.number} issue={iss} />)}
    </div>
  </div>
);

const Dashboard = () => {
  const [pluginFilter, setPluginFilter] = React.useState("all");
  const [wontDoOpen, setWontDoOpen] = React.useState(false);
  const issues = window.SAMPLE_ISSUES;

  const counts = React.useMemo(() => {
    const m = { all: issues.length };
    for (const p of window.PLUGINS) m[p] = 0;
    for (const i of issues) m[i.plugin] = (m[i.plugin] || 0) + 1;
    return m;
  }, [issues]);

  const visible = pluginFilter === "all" ? issues : issues.filter((i) => i.plugin === pluginFilter);
  const byStatus = React.useMemo(() => {
    const m = { "Todo": [], "In Progress": [], "In Review": [], "Done": [], "Won't do": [] };
    for (const i of visible) m[i.status].push(i);
    return m;
  }, [visible]);

  const totalIssues = issues.length;
  const totalDone = issues.filter((i) => i.status === "Done").length;

  return (
    <div className="dash">
      <window.Field />
      <div className="dash-inner">
        <div className="center-header">
          <div className="center-eyebrow">
            <span className="center-num">01</span>
            <h1 className="center-title">Project board</h1>
            <span className="center-status">in progress</span>
          </div>
          <p className="center-desc">
            Issues across the polyrepo, grouped by status. Source:{" "}
            <code className="mono" style={{ color: "var(--fg)" }}>github.com/subagentorganizations</code> · Project #1.
          </p>
        </div>

        <div className="stats">
          <div className="stat">
            <span className="sc">Plugins</span>
            <span className="stat-value">{window.PLUGINS.length}</span>
          </div>
          <div className="stat">
            <span className="sc">Issues</span>
            <span className="stat-value">{totalIssues}</span>
          </div>
          <div className="stat">
            <span className="sc">In Progress</span>
            <span className="stat-value" style={{ color: "var(--accent)" }}>{byStatus["In Progress"].length}</span>
          </div>
          <div className="stat">
            <span className="sc">Done</span>
            <span className="stat-value">{totalDone}/{totalIssues}</span>
          </div>
        </div>

        <div className="filters" role="tablist" aria-label="Filter by plugin">
          <span className="filter-label">Plugin</span>
          <button
            role="tab"
            aria-selected={pluginFilter === "all"}
            className={`filter-chip ${pluginFilter === "all" ? "is-active" : ""}`}
            onClick={() => setPluginFilter("all")}
          >
            all <span className="filter-chip-count">{counts.all}</span>
          </button>
          {window.PLUGINS.map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={pluginFilter === p}
              className={`filter-chip ${pluginFilter === p ? "is-active" : ""}`}
              onClick={() => setPluginFilter(p)}
              style={pluginFilter === p ? {} : {}}
            >
              <span style={{ display: "inline-block", width: 6, height: 6, background: `var(--plug-${p})` }} />
              {window.PLUGIN_LABEL[p]}
              <span className="filter-chip-count">{counts[p] || 0}</span>
            </button>
          ))}
        </div>

        <div className="kanban">
          {STATUS_COLS.map((s) => (
            <Column key={s} status={s} issues={byStatus[s]} />
          ))}
        </div>

        <div className="wontdo" data-open={wontDoOpen ? "true" : "false"}>
          <button
            className="wontdo-toggle"
            onClick={() => setWontDoOpen((v) => !v)}
            aria-expanded={wontDoOpen}
          >
            <span className="chevron" aria-hidden="true">›</span>
            <span>Won't do</span>
            <span className="col-count">{byStatus["Won't do"].length}</span>
          </button>
          <div className="wontdo-body">
            {byStatus["Won't do"].map((iss) => <IssueRow key={iss.number} issue={iss} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

window.Dashboard = Dashboard;
