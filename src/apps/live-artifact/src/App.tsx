import { Activity } from 'lucide-react';

/**
 * App — live-artifact dashboard root.
 *
 * Spec: docs/spec/frontend/vite-scaffold.md (this file is the entry point)
 *      + docs/spec/frontend/live-data.md (data fetch via Cloudflare Pages Function)
 *      + docs/spec/frontend/design-brief.md (visual design)
 *
 * The component-level architecture is deliberately minimal at scaffold
 * time: prove the build/dev pipeline works, then split into per-route
 * components in a follow-up PR per the design brief.
 */
export default function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#e5e5e5',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <main
        style={{
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '640px',
        }}
      >
        <Activity
          size={48}
          color="#5eead4"
          style={{ marginBottom: '1.5rem' }}
        />
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 600,
            margin: '0 0 0.75rem',
            color: '#fafafa',
          }}
        >
          subagent-organizations
        </h1>
        <p
          style={{
            margin: '0 0 1.5rem',
            color: '#888',
            fontSize: '1rem',
          }}
        >
          Live-artifact dashboard
        </p>
        <code
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: '#0f0f10',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '0.375rem',
            color: '#888',
            fontSize: '0.875rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          scaffold v0.0.1 — see docs/spec/frontend/
        </code>
      </main>
    </div>
  );
}
