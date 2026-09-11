export function Sheet({ children, className = '' }: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return <div className={`sheet ${className}`}>{children}</div>;
}
