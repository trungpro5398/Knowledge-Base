"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const MarkdownPreview = memo(function MarkdownPreview({
  content,
  previewUrls,
}: {
  content: string;
  previewUrls: Record<string, string>;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        img: ({ src, alt }) => (
          <img src={typeof src === "string" ? previewUrls[src] ?? src : ""} alt={alt ?? ""} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
});
