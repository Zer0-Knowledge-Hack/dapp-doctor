import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

/** A labelled input in the landing's .field style: machine values in mono. */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  learnMoreHref,
  learnMoreLabel,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  learnMoreHref?: string;
  learnMoreLabel?: string;
  id?: string;
}): React.ReactElement {
  const inputId = id ?? label;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  return (
    <div className="block min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={inputId} className="text-sm font-semibold">
          {label}
        </label>
        {learnMoreHref && learnMoreLabel && (
          <Link href={learnMoreHref} prefetch={false} className="text-xs font-semibold text-pen underline underline-offset-4">
            {learnMoreLabel}
          </Link>
        )}
      </div>
      <input
        id={inputId}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
        className="field min-h-11 w-full px-3 text-sm"
      />
      {hint && !error && (
        <p id={hintId} className="mt-2 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-2 flex items-start gap-2 text-sm text-ink">
          <Icon name="error" className="mt-0.5 text-triage-red" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
