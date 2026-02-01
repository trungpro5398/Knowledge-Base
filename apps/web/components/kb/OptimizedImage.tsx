"use client";

import Image from "next/image";
import { useState } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export function OptimizedImage({ src, alt, width, height }: OptimizedImageProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <img src={src} alt={alt} className="rounded-lg border" loading="lazy" />
    );
  }

  // Check if it's an external URL or Supabase storage
  const isExternal = src.startsWith("http");
  
  if (!isExternal) {
    // Local image, use regular img tag
    return <img src={src} alt={alt} className="rounded-lg border" loading="lazy" />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 800}
      height={height || 600}
      className="rounded-lg border"
      loading="lazy"
      onError={() => setError(true)}
      unoptimized={src.includes("supabase")} // Supabase storage URLs
    />
  );
}
