'use client';

import { useState } from 'react';
import { Icon } from './Icon';
import { toast } from './Toasts';

export function CopyButton({ value, label, copiedLabel }: {
  value: string;
  label: string;
  copiedLabel: string;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast(copiedLabel);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* the value stays visible to copy by hand */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="btn-plain inline-flex min-h-10 items-center gap-2 px-3 text-sm"
    >
      <Icon name={copied ? 'check' : 'copy'} />
      {copied ? copiedLabel : label}
    </button>
  );
}
