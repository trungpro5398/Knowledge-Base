"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    ChevronDown,
    FolderOpen,
    Building2,
    Plus,
    Search,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Space {
    id: string;
    name: string;
    slug: string;
    organization_id?: string | null;
}

interface Organization {
    id: string;
    name: string;
    icon?: string | null;
}

interface SpaceSwitcherProps {
    spaces: Space[];
    organizations: Organization[];
    currentSpaceId?: string;
}

export function SpaceSwitcher({
    spaces,
    organizations,
    currentSpaceId
}: SpaceSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const pathname = usePathname();

    const currentSpace = spaces.find((s) => s.id === currentSpaceId);

    // Group spaces by organization
    const spacesByOrg = spaces.reduce((acc, space) => {
        const orgId = space.organization_id || "standalone";
        if (!acc[orgId]) acc[orgId] = [];
        acc[orgId].push(space);
        return acc;
    }, {} as Record<string, Space[]>);

    // Filter spaces based on search
    const filteredSpaces = searchQuery
        ? spaces.filter((s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.slug.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : null;

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
        }
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen]);

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                    "hover:bg-muted/50",
                    isOpen && "bg-muted"
                )}
            >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                    <FolderOpen className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                        {currentSpace?.name || "Select Space"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                        {currentSpace?.slug || "No space selected"}
                    </p>
                </div>
                <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-lg border bg-card shadow-lg animate-fade-in overflow-hidden">
                        {/* Search */}
                        <div className="p-2 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search spaces..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-background"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Spaces List */}
                        <div className="max-h-[320px] overflow-y-auto p-2">
                            {filteredSpaces ? (
                                // Show filtered results
                                filteredSpaces.length > 0 ? (
                                    <div className="space-y-1">
                                        {filteredSpaces.map((space) => (
                                            <SpaceItem
                                                key={space.id}
                                                space={space}
                                                isActive={space.id === currentSpaceId}
                                                onClick={() => setIsOpen(false)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-6">
                                        No spaces found
                                    </p>
                                )
                            ) : (
                                // Show grouped spaces
                                <div className="space-y-4">
                                    {organizations.map((org) => {
                                        const orgSpaces = spacesByOrg[org.id] || [];
                                        if (orgSpaces.length === 0) return null;

                                        return (
                                            <div key={org.id}>
                                                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    {org.icon || <Building2 className="h-3 w-3" />}
                                                    <span>{org.name}</span>
                                                </div>
                                                <div className="space-y-0.5 mt-1">
                                                    {orgSpaces.map((space) => (
                                                        <SpaceItem
                                                            key={space.id}
                                                            space={space}
                                                            isActive={space.id === currentSpaceId}
                                                            onClick={() => setIsOpen(false)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Standalone spaces */}
                                    {spacesByOrg.standalone && spacesByOrg.standalone.length > 0 && (
                                        <div>
                                            <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Other Spaces
                                            </div>
                                            <div className="space-y-0.5 mt-1">
                                                {spacesByOrg.standalone.map((space) => (
                                                    <SpaceItem
                                                        key={space.id}
                                                        space={space}
                                                        isActive={space.id === currentSpaceId}
                                                        onClick={() => setIsOpen(false)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-2 border-t">
                            <Link
                                href="/admin"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Create new space
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function SpaceItem({
    space,
    isActive,
    onClick
}: {
    space: Space;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <Link
            href={`/admin/spaces/${space.id}/tree`}
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted"
            )}
        >
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{space.name}</span>
            {isActive && <Check className="h-4 w-4 shrink-0" />}
        </Link>
    );
}
