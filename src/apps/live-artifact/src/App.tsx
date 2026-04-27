/**
 * App — live-artifact dashboard root.
 *
 * Spec:
 *   docs/spec/frontend/vite-scaffold.md (this file is the entry point)
 *   docs/spec/frontend/content-routes.md (route table — Dashboard, Plugins, ADR, Changelog)
 *   docs/spec/frontend/live-data.md (data fetch — useProjects + /api/projects)
 *   docs/spec/frontend/design-brief.md (visual design — kanban + plugin pages)
 *
 * Wires every route component the frontend PRs A-G shipped into wouter
 * inside the PageShell. The previous version of this file rendered only
 * the scaffold landing card and never integrated the Dashboard, plugin
 * pages, ADR pages, or Changelog — visitors saw a placeholder regardless
 * of the URL. PRs B-G's components were on disk but unreachable.
 */

import { Route, Switch } from 'wouter';
import { PageShell } from './components/PageShell/PageShell';
import { Dashboard } from './routes/Dashboard';
import { PluginPage } from './routes/PluginPage';
import { AdrIndex } from './routes/AdrIndex';
import { AdrPage } from './routes/AdrPage';
import { Changelog } from './routes/Changelog';
import { NotFound } from './routes/NotFound';

export default function App() {
  return (
    <PageShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/plugins" component={Dashboard} />
        <Route path="/plugins/:name" component={PluginPage} />
        <Route path="/adr" component={AdrIndex} />
        <Route path="/adr/:slug" component={AdrPage} />
        <Route path="/changelog" component={Changelog} />
        <Route component={NotFound} />
      </Switch>
    </PageShell>
  );
}
