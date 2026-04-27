import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Design tokens + reset + component classes (from Claude Design handoff,
// staging/2026-04-26-live-artifact-design). Must import before any
// component that uses class names like .topbar, .tb-tab, .field, etc.
import './styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
