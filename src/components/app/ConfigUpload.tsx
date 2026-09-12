'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { hasParsedFields, parseConfigFile } from '@/lib/forms/parseConfigFile';
import type { TargetFields } from '@/lib/forms/targetFields';

const MAX_BYTES = 64 * 1024;

export function ConfigUpload({
  onParsed,
  copy,
}: {
  onParsed: (fields: Partial<TargetFields>) => void;
  copy: { upload: string; empty: string; error: string; filled: string };
}): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setNote(copy.error);
      return;
    }
    try {
      const text = await file.text();
      const fields = parseConfigFile(text);
      if (!hasParsedFields(fields)) {
        setNote(copy.empty);
        return;
      }
      onParsed(fields);
      setNote(copy.filled);
    } catch {
      setNote(copy.error);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="min-w-0">
      <input
        ref={inputRef}
        type="file"
        accept=".env,.local,.json,.txt,text/plain,application/json"
        className="sr-only"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
      <button
        type="button"
        className="btn-plain inline-flex min-h-10 items-center gap-2 px-3 text-sm"
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="upload" size={16} />
        {copy.upload}
      </button>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}
