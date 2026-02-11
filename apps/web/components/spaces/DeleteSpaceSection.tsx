"use client";

import { useLocale } from "@/lib/i18n/locale-provider";
import { DeleteSpaceButton } from "./DeleteSpaceButton";

interface DeleteSpaceSectionProps {
  spaceId: string;
  spaceName: string;
  pageCount?: number;
}

export function DeleteSpaceSection({
  spaceId,
  spaceName,
  pageCount = 0,
}: DeleteSpaceSectionProps) {
  const { t } = useLocale();

  return (
    <section className="pt-6 border-t border-border">
      <h2 className="text-sm font-semibold text-destructive mb-2">
        {t("settings.dangerZone")}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {t("settings.deleteSpaceDescription")}
      </p>
      <DeleteSpaceButton
        spaceId={spaceId}
        spaceName={spaceName}
        pageCount={pageCount}
      />
    </section>
  );
}
