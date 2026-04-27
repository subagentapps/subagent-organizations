import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Order matters: tokens.css declares the --space-*, --type-*, --radius-*,
// --motion-*, --plugin-*, --bg-elevated CSS custom properties that the
// route-level CSS Modules (Dashboard.module.css, PluginsIndex.module.css,
// etc.) consume. global.css then layers the design-handoff classes
// (.topbar, .tb-tab, .field, etc.) on top. If global.css imports first
// the cascade still works for tokens both files declare, but the
// Modules' var() lookups would resolve to invalid values for any token
// only declared in tokens.css. Spec: docs/spec/frontend/design-brief.md.
import './styles/tokens.css';
import './styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
