'use client';

import { useEffect, useImperativeHandle, useRef } from 'react';
import { BEAT } from '@/components/ecg/Ecg';

/**
 * A bedside monitor sweep, drawn on canvas over the page's ECG paper.
 *
 * The trace runs left to right and wraps, erasing just ahead of itself like a
 * real monitor. A beat is drawn only when the page calls `beat()`, which it
 * does once per new block: the strip never invents a heartbeat.
 */

export interface MonitorHandle {
  /** Draws one PQRST complex, starting now, at this relative height. */
  beat(amplitude: number): void;
}

/** Seconds of time across the full width of the strip. */
const SWEEP_SECONDS = 8;
/** How long one PQRST complex takes to draw. */
const BEAT_MS = 420;
/** The blank gap kept ahead of the trace. */
const ERASE_PX = 16;
const BEAT_SPAN = BEAT[BEAT.length - 1][0];

/** Offset from the baseline, in BEAT units, at `u` along the complex (0 to BEAT_SPAN). */
function beatOffset(u: number): number {
  for (let i = 1; i < BEAT.length; i++) {
    const [x1, y1] = BEAT[i];
    const [x0, y0] = BEAT[i - 1];
    if (u <= x1) return x1 === x0 ? y1 : y0 + ((u - x0) / (x1 - x0)) * (y1 - y0);
  }
  return 0;
}

export function Monitor({ ref, running, label, className = '' }: {
  ref?: React.Ref<MonitorHandle>;
  running: boolean;
  label: string;
  className?: string;
}): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beats = useRef<Array<{ start: number; amplitude: number }>>([]);
  // The sweep position survives pauses, so stopping and listening again
  // continues the strip instead of restarting it.
  const sweep = useRef({ x: 0, y: 0, last: 0 });

  useImperativeHandle(ref, () => ({
    beat(amplitude: number) {
      beats.current = [...beats.current.slice(-4), { start: performance.now(), amplitude }];
    },
  }), []);

  // Sizing: the canvas matches its box in device pixels, so the line stays crisp.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      // A resized strip starts over with a flat baseline, never a blank box.
      context.clearRect(0, 0, width, height);
      context.strokeStyle = getComputedStyle(canvas).color;
      context.lineWidth = 3;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      const baseline = height * 0.62;
      context.beginPath();
      context.moveTo(0, baseline);
      context.lineTo(width, baseline);
      context.stroke();
      sweep.current = { x: 0, y: baseline, last: 0 };
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let frame = 0;
    sweep.current.last = performance.now();

    const yAt = (time: number, baseline: number, scale: number) => {
      for (const { start, amplitude } of beats.current) {
        const elapsed = time - start;
        if (elapsed >= 0 && elapsed < BEAT_MS) {
          return baseline + beatOffset((elapsed / BEAT_MS) * BEAT_SPAN) * amplitude * scale;
        }
      }
      return baseline;
    };

    const draw = (now: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const baseline = height * 0.62;
      const scale = height / 120;
      const pxPerMs = width / (SWEEP_SECONDS * 1000);
      const state = sweep.current;
      const advance = Math.min(width, (now - state.last) * pxPerMs);

      context.strokeStyle = getComputedStyle(canvas).color;
      context.beginPath();
      context.moveTo(state.x, state.y);
      // One point per pixel, each at the moment the sweep crossed it.
      for (let step = 1; step <= Math.ceil(advance); step++) {
        const px = Math.min(step, advance);
        let x = state.x + px;
        const y = yAt(state.last + px / pxPerMs, baseline, scale);
        if (x >= width) {
          x -= width;
          context.stroke();
          context.beginPath();
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
        if (step === Math.ceil(advance)) {
          state.x = x;
          state.y = y;
        }
      }
      context.stroke();

      // Erase just ahead of the trace, wrapping at the edge.
      const eraseFrom = state.x + 2;
      context.clearRect(eraseFrom, 0, ERASE_PX, height);
      if (eraseFrom + ERASE_PX > width) context.clearRect(0, 0, eraseFrom + ERASE_PX - width, height);

      state.last = now;
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return <canvas ref={canvasRef} role="img" aria-label={label} className={`block w-full text-ink ${className}`} />;
}
