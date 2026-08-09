"use client";

import { KbUnavailable } from "@/components/kb/KbUnavailable";

export default function KbError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <KbUnavailable onRetry={reset} />;
}
