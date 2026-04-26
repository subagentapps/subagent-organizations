/**
 * MarkdownBody — render markdown safely with cross-link rewriting.
 *
 * Spec: docs/spec/frontend/content-routes.md
 *
 * Pipeline:
 *   marked.parse(markdown)        // → HTML
 *   DOMPurify.sanitize(html)      // strip <script>, on* attrs, etc.
 *   rewriteCrossLinks(html)       // ./NNNN-title.md → /adr/NNNN
 *
 * The rewrite step keeps ADR cross-links inside the SPA — wouter handles
 * the navigation without a full page reload.
 *
 * marked is configured with `breaks: true` (newlines → <br/>) and
 * `gfm: true` (tables, task lists, autolinks). DOMPurify uses the
 * default profile which already blocks <script>, <iframe>, on* event
 * handlers — see config below if a fixture needs to embed an iframe
 * (none currently do).
 */

import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useLocation } from 'wouter';
import styles from './MarkdownBody.module.css';

marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Rewrite ADR cross-links inside HTML so they navigate within the SPA.
 *
 * Looks for `href="./NNNN-anything.md"` (the on-disk shape) and
 * transforms to `href="/adr/NNNN"` (the route shape). Other links pass
 * through unchanged.
 */
function rewriteCrossLinks(html: string): string {
  return html.replace(
    /href="\.\/(\d{4})-[^"]*\.md"/g,
    (_match, num: string) => `href="/adr/${num}"`,
  );
}

export interface MarkdownBodyProps {
  /** Raw markdown source. */
  source: string;
  /** Optional: skip cross-link rewrite (e.g. for changelog bodies). */
  skipCrossLinks?: boolean;
}

export function MarkdownBody({ source, skipCrossLinks }: MarkdownBodyProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [, navigate] = useLocation();
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(marked.parse(source))
      .then((rendered) => {
        if (cancelled) return;
        const safe = DOMPurify.sanitize(rendered);
        const final = skipCrossLinks ? safe : rewriteCrossLinks(safe);
        setHtml(final);
      })
      .catch(() => {
        if (cancelled) return;
        setHtml('');
      });
    return () => {
      cancelled = true;
    };
  }, [source, skipCrossLinks]);

  /**
   * Intercept clicks on internal links so they go through wouter
   * instead of triggering a full page reload. Only intercepts:
   *   - Same-origin links
   *   - Plain left-clicks (no modifier keys)
   *   - href starting with `/`
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      e.preventDefault();
      navigate(href);
    };
    container.addEventListener('click', onClick);
    return () => container.removeEventListener('click', onClick);
  }, [navigate]);

  return (
    <div
      ref={containerRef}
      className={styles.body}
      // eslint-disable-next-line react/no-danger -- sanitized via DOMPurify above
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
