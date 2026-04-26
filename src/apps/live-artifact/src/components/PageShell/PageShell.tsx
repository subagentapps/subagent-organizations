/**
 * PageShell — top nav + main content area.
 *
 * Spec: design-brief says "top nav (logo / Dashboard / Plugins / ADR /
 * Changelog), no sidebar, no footer."
 *
 * Used by every route. Field animation is rendered separately by the
 * route components that opt into it (currently only Dashboard).
 */

import { Link, useLocation } from 'wouter';
import type { ReactNode } from 'react';
import { Logo } from '../Logo/Logo';
import styles from './PageShell.module.css';

const NAV_ITEMS: Array<{ href: string; label: string; matchPrefix?: string }> = [
  { href: '/', label: 'Dashboard' },
  { href: '/plugins', label: 'Plugins', matchPrefix: '/plugins' },
  { href: '/adr', label: 'ADR', matchPrefix: '/adr' },
  { href: '/changelog', label: 'Changelog' },
];

function isActive(currentPath: string, item: { href: string; matchPrefix?: string }) {
  if (item.matchPrefix) return currentPath.startsWith(item.matchPrefix);
  return currentPath === item.href;
}

export interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const [location] = useLocation();
  return (
    <>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Primary">
          <Link href="/" className={styles.logoLink}>
            <Logo size={24} />
            <span className={styles.brand}>subagent-organizations</span>
          </Link>
          <ul className={styles.navList}>
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    isActive(location, item)
                      ? `${styles.navLink} ${styles.navLinkActive}`
                      : styles.navLink
                  }
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
    </>
  );
}
