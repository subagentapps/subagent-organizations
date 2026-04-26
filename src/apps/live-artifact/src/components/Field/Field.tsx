/**
 * <Field /> — sparse Braille-dot backdrop animation.
 *
 * Spec: design-brief says "subtle Braille-dot backdrop animation behind
 * the dashboard route only — sparse white dots drifting at <2 fps,
 * opacity 0.03. NOT distracting; users should barely notice it."
 *
 * Implementation: a fixed-position canvas behind content, rendering
 * ~30 dots that drift on a slow random walk. Updates at <2fps via
 * setInterval (NOT requestAnimationFrame — that would target 60fps and
 * drain battery for an effect that's deliberately barely visible).
 *
 * Respects `prefers-reduced-motion: reduce` — renders static dots.
 */

import { useEffect, useRef } from 'react';
import styles from './Field.module.css';

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const DOT_COUNT = 30;
const TICK_MS = 600;          // ~1.67 fps — under the spec's <2fps requirement
const DOT_RADIUS = 1.5;
const SPEED = 0.3;            // px per tick

function makeDot(width: number, height: number): Dot {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * SPEED * 2,
    vy: (Math.random() - 0.5) * SPEED * 2,
  };
}

export function Field() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Re-seed dots when canvas size changes
      dotsRef.current = Array.from({ length: DOT_COUNT }, () =>
        makeDot(width, height),
      );
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (const dot of dotsRef.current) {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = () => {
      for (const dot of dotsRef.current) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        // Wrap around edges
        if (dot.x < 0) dot.x = width;
        if (dot.x > width) dot.x = 0;
        if (dot.y < 0) dot.y = height;
        if (dot.y > height) dot.y = 0;
        // Tiny direction perturbation so motion isn't uniform
        dot.vx += (Math.random() - 0.5) * 0.05;
        dot.vy += (Math.random() - 0.5) * 0.05;
        // Clamp speed
        dot.vx = Math.max(-SPEED, Math.min(SPEED, dot.vx));
        dot.vy = Math.max(-SPEED, Math.min(SPEED, dot.vy));
      }
      draw();
    };

    resize();
    window.addEventListener('resize', resize);

    let interval: ReturnType<typeof setInterval> | null = null;
    if (!reduced) {
      interval = setInterval(tick, TICK_MS);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (interval !== null) clearInterval(interval);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.field} aria-hidden="true" />;
}
