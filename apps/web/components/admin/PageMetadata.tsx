"use client";

import { formatDistanceToNow } from "@/lib/utils";
import { Calendar, Eye } from "lucide-react";

interface PageMetadataProps {
    author?: string;
    updatedAt: string;
    views?: number;
}

export function PageMetadata({ author, updatedAt, views }: PageMetadataProps) {
    const timeAgo = formatDistanceToNow(updatedAt);

    return (
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {author && (
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {author.charAt(0).toUpperCase()}
                    </div>
                    <span>{author}</span>
                </div>
            )}

            <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Updated {timeAgo}</span>
            </div>

            {views !== undefined && (
                <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{views} views</span>
                </div>
            )}
        </div>
    );
}
