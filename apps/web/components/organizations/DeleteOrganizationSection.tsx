"use client";

import { useLocale } from "@/lib/i18n/locale-provider";
import { DeleteOrganizationButton } from "./DeleteOrganizationButton";

interface DeleteOrganizationSectionProps {
  organizationId: string;
  organizationName: string;
  spaceCount?: number;
}

export function DeleteOrganizationSection({
  organizationId,
  organizationName,
  spaceCount = 0,
}: DeleteOrganizationSectionProps) {
  const { t } = useLocale();

  return (
    <section className="pt-6 border-t border-border">
      <h2 className="text-sm font-semibold text-destructive mb-2">
        {t("settings.dangerZone")}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {t("settings.deleteOrgDescription")}
      </p>
      <DeleteOrganizationButton
        organizationId={organizationId}
        organizationName={organizationName}
        spaceCount={spaceCount}
      />
    </section>
  );
}
