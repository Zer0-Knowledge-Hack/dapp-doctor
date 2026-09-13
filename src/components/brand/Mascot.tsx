import Image from 'next/image';
import mascot from '../../../public/brand/dapp-doctor-mascot.png';

/**
 * The DApp Doctor otter. A companion character, never part of the logo.
 *
 * The image is used exactly as drawn. Its intrinsic size comes from the static
 * import, so the space it takes is reserved before it loads: no layout shift.
 * Most uses are decorative, next to a sentence that already says what matters,
 * so the alt text is empty unless one is given.
 */
export type MascotVariant = 'default' | 'ready' | 'working' | 'empty';

export function Mascot({ size, className = '', priority = false, alt = '', variant = 'default', sizes }: {
  /** Width in CSS pixels. Height follows the image's proportions. */
  size: number;
  className?: string;
  /** Load eagerly: only for a mascot visible on arrival, above the fold. */
  priority?: boolean;
  alt?: string;
  /** Reserved for future poses; `working` adds the gentle loading motion. */
  variant?: MascotVariant;
  /** Responsive sizes hint, when CSS changes the width across breakpoints. */
  sizes?: string;
}): React.ReactElement {
  return (
    <Image
      src={mascot}
      alt={alt}
      width={size}
      priority={priority}
      sizes={sizes ?? `${size}px`}
      data-variant={variant}
      className={`h-auto select-none ${variant === 'working' ? 'mascot-working' : ''} ${className}`}
      style={{ width: size }}
      draggable={false}
    />
  );
}
