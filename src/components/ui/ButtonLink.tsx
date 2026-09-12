import Link from 'next/link';

export function ButtonLink({ href, variant, children }: {
  href: string;
  variant: 'pen' | 'plain';
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`${variant === 'pen' ? 'btn-pen' : 'btn-plain'} inline-flex min-h-11 max-w-full items-center justify-center px-4 py-2 text-center text-sm leading-snug sm:px-5`}
    >
      {children}
    </Link>
  );
}
