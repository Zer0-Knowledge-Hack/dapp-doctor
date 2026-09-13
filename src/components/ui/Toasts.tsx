'use client';

import { useEffect, useState } from 'react';

type Toast = { id: number; message: string };

const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];
let nextId = 1;

export function toast(message: string): void {
  const item = { id: nextId++, message };
  toasts = [...toasts, item];
  listeners.forEach((listen) => listen(toasts));
  window.setTimeout(() => {
    toasts = toasts.filter((toastItem) => toastItem.id !== item.id);
    listeners.forEach((listen) => listen(toasts));
  }, 2800);
}

/** Secondary confirmations only. Critical errors stay in Notice. */
export function ToastHost(): React.ReactElement {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);
  if (items.length === 0) return <></>;
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2">
      {items.map((item) => (
        <p key={item.id} className="pointer-events-auto border-2 border-ink bg-sheet px-4 py-3 text-sm font-semibold shadow-[4px_4px_0_var(--ink)]">
          {item.message}
        </p>
      ))}
    </div>
  );
}
