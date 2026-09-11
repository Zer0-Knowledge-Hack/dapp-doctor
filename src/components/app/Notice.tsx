/**
 * A message on the page. The bar says what kind: pen for something to act on,
 * red for a failure, black for plain information. Text stays ink for contrast.
 */
const BAR = {
  info: 'border-ink',
  action: 'border-pen',
  failure: 'border-triage-red',
  success: 'border-triage-green',
};

export function Notice({ tone = 'info', children }: {
  tone?: keyof typeof BAR;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <p role={tone === 'failure' ? 'alert' : undefined} className={`max-w-[70ch] border-l-4 bg-sheet py-3 pr-4 pl-4 text-sm leading-relaxed ${BAR[tone]}`}>
      {children}
    </p>
  );
}
