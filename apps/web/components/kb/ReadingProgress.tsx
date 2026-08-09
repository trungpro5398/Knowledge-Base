"use client";

import { useEffect, useRef } from "react";

/** Visual-only reading progress that updates without re-rendering the page. */
export function ReadingProgress() {
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      if (indicatorRef.current) {
        indicatorRef.current.style.transform = `scaleX(${progress})`;
      }
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-[45] h-0.5" aria-hidden="true">
      <div
        ref={indicatorRef}
        className="h-full origin-left scale-x-0 bg-brand-orange"
      />
    </div>
  );
}
