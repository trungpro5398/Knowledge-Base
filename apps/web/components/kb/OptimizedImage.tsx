interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export function OptimizedImage({ src, alt, width, height }: OptimizedImageProps) {
  if (!src) return null;

  const fallbackWidth = width ?? 800;
  const fallbackHeight = height ?? 600;

  return (
    <img
      src={src}
      alt={alt}
      width={fallbackWidth}
      height={fallbackHeight}
      className="h-auto max-w-full rounded-lg border"
      loading="lazy"
      decoding="async"
    />
  );
}
