/**
 * PageShell — top bar + main content area + skip-link.
 *
 * Implements the Claude Design handoff (staging/2026-04-26-live-artifact-
 * design/.../shell.jsx): avatar (Braille-SO logo), breadcrumb crumb,
 * 4 underline tabs, live status pill, GitHub link.
 *
 * Uses the global classes from styles/global.css verbatim (.topbar,
 * .tb-brand, .tb-avatar, .tb-crumb, .tb-tabs, .tb-tab, .tb-meta,
 * .tb-status, .tb-gh) — not CSS Modules — so future design tweaks land
 * in one place.
 *
 * Accessibility:
 *   - <a href="#main"> skip-link
 *   - aria-current="page" on the active tab
 *   - <main id="main"> matches the skip-link target
 *   - aria-label on the nav landmark
 */

import { Link, useLocation } from 'wouter';
import type { ReactNode } from 'react';
import { SoLogo } from '../Logo/SoLogo';

const TABS: Array<{ id: string; href: string; label: string; matchPrefix?: string }> = [
  { id: 'dashboard', href: '/', label: 'Dashboard' },
  { id: 'plugins', href: '/plugins', label: 'Plugins', matchPrefix: '/plugins' },
  { id: 'adr', href: '/adr', label: 'ADR', matchPrefix: '/adr' },
  { id: 'changelog', href: '/changelog', label: 'Changelog' },
];

function isActive(currentPath: string, tab: typeof TABS[number]) {
  if (tab.matchPrefix) return currentPath.startsWith(tab.matchPrefix);
  return currentPath === tab.href;
}

export interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const [location] = useLocation();
  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <div className="tb-brand">
          <span className="tb-avatar">
            <SoLogo size={14} />
          </span>
          <span className="tb-crumb">
            <span className="dim">subagent</span>
            <span className="sep">/</span>subagent-organizations
          </span>
        </div>

        <nav className="tb-tabs" aria-label="Primary">
          {TABS.map((tab) => {
            const active = isActive(location, tab);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`tb-tab ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="tb-meta">
          <span className="tb-status">
            <span className="dot" />
            on track
          </span>
          <a
            className="tb-gh"
            href="https://github.com/subagentapps/subagent-organizations"
            target="_blank"
            rel="noreferrer noopener"
          >
            View on GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
