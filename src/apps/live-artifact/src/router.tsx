/**
 * Router — wouter Switch mapping routes → components.
 *
 * Spec: docs/spec/frontend/content-routes.md § Route table
 *
 * Routes wrap in <PageShell> for the consistent top nav. The Field
 * animation is rendered by Dashboard only (per design-brief).
 */

import { Route, Switch } from 'wouter';
import { PageShell } from './components/PageShell/PageShell';
import { Dashboard } from './routes/Dashboard';
import { PluginPage } from './routes/PluginPage';
import { AdrIndex } from './routes/AdrIndex';
import { AdrPage } from './routes/AdrPage';
import { Changelog } from './routes/Changelog';
import { NotFound } from './routes/NotFound';

export function Router() {
  return (
    <PageShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/plugins/:name" component={PluginPage} />
        <Route path="/plugins" component={Dashboard} />
        <Route path="/adr" component={AdrIndex} />
        <Route path="/adr/:number" component={AdrPage} />
        <Route path="/changelog" component={Changelog} />
        <Route component={NotFound} />
      </Switch>
    </PageShell>
  );
}
