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
      className={`${variant === 'pen' ? 'btn-pen' : 'btn-plain'} inline-flex min-h-12 max-w-full items-center justify-center px-5 py-3 text-center text-base leading-snug sm:px-6`}
    >
      {children}
    </Link>
  );
}
