'use client';

import { useId, useState } from 'react';
import { Icon } from './Icon';

/** Accessible extra explanation. Text stays available without colour or hover alone. */
export function InfoTip({ label, children }: { label: string; children: string }): React.ReactElement {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center text-muted"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
      >
        <Icon name="info" size={16} />
        <span className="sr-only">{label}</span>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute top-full left-0 z-20 mt-1 w-[min(18rem,calc(100vw-2.5rem))] border-2 border-ink bg-sheet p-3 text-left text-sm leading-relaxed text-ink shadow-[3px_3px_0_var(--ink)]"
        >
          {children}
        </span>
      )}
    </span>
  );
}
