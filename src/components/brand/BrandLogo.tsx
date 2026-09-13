/**
 * The DApp Doctor mark: a medical cross carrying a small network, four nodes
 * joined to a hub, the RPC endpoint being diagnosed. Drawn inline so it is
 * crisp at any size and costs no request. Same geometry as
 * public/brand/dapp-doctor-mark.svg (scripts/brand-assets.mts writes both).
 */
export function BrandMark({ size = 32, className = '' }: { size?: number; className?: string }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <rect x="1.5" y="1.5" width="45" height="45" fill="var(--pen)" stroke="var(--ink)" strokeWidth="3" />
      <path d="M18.5 7.5h11v11h11v11h-11v11h-11v-11h-11v-11h11z" fill="#fff" />
      <path d="M24 13v22M13 24h22" stroke="var(--ink)" strokeWidth="2" />
      <g fill="var(--ink)">
        <circle cx="24" cy="13" r="3" />
        <circle cx="35" cy="24" r="3" />
        <circle cx="24" cy="35" r="3" />
        <circle cx="13" cy="24" r="3" />
      </g>
      <rect x="21.5" y="21.5" width="5" height="5" fill="var(--pen)" stroke="var(--ink)" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * Mark and wordmark, for the header. The name truncates rather than wraps, so
 * on a phone the menu button, language and account controls keep their room.
 */
export function BrandLogo({ name }: { name: string }): React.ReactElement {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <BrandMark size={28} />
      <span className="truncate font-display text-lg leading-none font-black sm:text-xl">{name}</span>
    </span>
  );
}
