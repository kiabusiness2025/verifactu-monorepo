import Image from 'next/image';
import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  objectPosition?: string;
  quality?: number;
  blurDataURL?: string;
  placeholder?: 'blur' | 'empty';
}

/**
 * OptimizedImage Component
 * 
 * Wrapper around Next.js Image component with sensible defaults for Verifactu.business.
 * 
 * Automatically:
 * - Generates responsive srcSet
 * - Converts to webp/avif formats
 * - Lazy loads below the fold
 * - Prevents Cumulative Layout Shift (CLS)
 * - Handles loading state gracefully
 * 
 * @example
 * <OptimizedImage
 *   src="/brand/logo.png"
 *   alt="Verifactu logo"
 *   width={200}
 *   height={50}
 * />
 */
const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(
  (
    {
      src,
      alt,
      width = 1200,
      height = 630,
      sizes,
      priority = false,
      className = '',
      objectFit = 'cover',
      objectPosition = 'center',
      quality = 75,
      blurDataURL,
      placeholder = blurDataURL ? 'blur' : 'empty',
    },
    ref
  ) => {
    // Default sizes based on common breakpoints
    const defaultSizes =
      sizes ||
      '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw';

    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          ref={ref}
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={defaultSizes}
          priority={priority}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          style={{
            objectFit,
            objectPosition,
          }}
          className="h-full w-full"
        />
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

export { OptimizedImage, type OptimizedImageProps };

/**
 * Utility: Generate blur placeholder from image
 * 
 * Usage:
 * ```typescript
 * const blurDataURL = await generateBlurPlaceholder('/path/to/image.jpg');
 * <OptimizedImage src="/path/to/image.jpg" blurDataURL={blurDataURL} />
 * ```
 * 
 * Note: This needs to be run at build time or using plaiceholder package
 */
export async function generateBlurPlaceholder(
  src: string
): Promise<string> {
  // This would require 'plaiceholder' package: pnpm add plaiceholder
  // For now, return empty string (no blur effect)
  // TODO: Implement with plaiceholder in future
  return '';
}

