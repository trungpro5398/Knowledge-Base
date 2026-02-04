"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Building2, ChevronDown, Check } from "lucide-react";
import type { ApiResponse } from "@/lib/api/types";

interface Organization {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
}

interface OrganizationSwitcherProps {
  currentOrgId?: string;
}

export function OrganizationSwitcher({ currentOrgId }: OrganizationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Organization[]>>("/api/organizations");
      return res.data || [];
    },
  });

  const currentOrg = organizations?.find((org) => org.id === currentOrgId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 animate-pulse">
        <div className="h-5 w-5 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
    );
  }

  if (!organizations || organizations.length === 0) {
    return null;
  }

  // If only one org, show it without dropdown
  if (organizations.length === 1) {
    const org = organizations[0]!;
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
        <div className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-primary text-xs">
          {org.icon || <Building2 className="h-3 w-3" aria-hidden="true" />}
        </div>
        <span className="text-sm font-medium truncate">{org.name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
        aria-expanded={isOpen}
        aria-controls="org-switcher-panel"
        aria-haspopup="listbox"
      >
        <div className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-primary text-xs">
          {currentOrg?.icon || <Building2 className="h-3 w-3" aria-hidden="true" />}
        </div>
        <span className="text-sm font-medium truncate flex-1 text-left">
          {currentOrg?.name || "Select Organization"}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-label="Close organization switcher"
          />
          <div
            id="org-switcher-panel"
            className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border rounded-lg shadow-lg overflow-hidden"
          >
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/admin/organizations/${org.id}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-primary text-xs">
                  {org.icon || <Building2 className="h-3 w-3" aria-hidden="true" />}
                </div>
                <span className="text-sm flex-1 truncate">{org.name}</span>
                {org.id === currentOrgId && (
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
