"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-provider";

interface KbNewToProSysLinkProps {
  spaceSlug: string;
}

export function KbNewToProSysLink({ spaceSlug }: KbNewToProSysLinkProps) {
  const { t } = useLocale();
  return (
    <p className="text-sm text-muted-foreground mb-3">
      <Link href={`/kb/${spaceSlug}`} className="hover:text-foreground underline">
        {t("welcome.newToProSys")}
      </Link>
    </p>
  );
}
