import ReactMarkdown from "react-markdown";
import { isValidElement, type ReactNode } from "react";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { OptimizedImage } from "./OptimizedImage";
import { headingId, slugifyHeading } from "@/lib/kb/headings";

interface PageRendererProps {
  content?: string;
  html?: string;
  pageTitle?: string;
}

function getNodeText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(getNodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(value)) return getNodeText(value.props.children);
  return "";
}

function removeDuplicateHtmlTitle(html: string, pageTitle?: string): string {
  if (!pageTitle) return html;
  return html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, "");
}

function removeDuplicateMarkdownTitle(content: string, pageTitle?: string): string {
  if (!pageTitle) return content;
  const lines = content.split("\n");
  const firstContentLine = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentLine === -1) return content;

  const match = lines[firstContentLine]!.match(/^#\s+(.+?)\s*#*\s*$/);
  if (!match) return content;

  lines.splice(firstContentLine, 1);
  return lines.join("\n");
}

export function PageRenderer({ content, html, pageTitle }: PageRendererProps) {
  if (html) {
    return <div className="prose-kb" dangerouslySetInnerHTML={{ __html: removeDuplicateHtmlTitle(html, pageTitle) }} />;
  }

  const headingCounts = new Map<string, number>();
  const getHeadingId = (children: ReactNode) => {
    const baseId = slugifyHeading(getNodeText(children));
    const count = headingCounts.get(baseId) ?? 0;
    headingCounts.set(baseId, count + 1);
    return headingId(baseId, count);
  };

  return (
    <div className="prose-kb">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => <h1 id={getHeadingId(children)}>{children}</h1>,
          h2: ({ children }) => {
            return <h2 id={getHeadingId(children)}>{children}</h2>;
          },
          h3: ({ children }) => {
            return <h3 id={getHeadingId(children)}>{children}</h3>;
          },
          img: ({ src, alt, width, height }) => {
            const parsedWidth =
              typeof width === "string" ? Number.parseInt(width, 10) : typeof width === "number" ? width : undefined;
            const parsedHeight =
              typeof height === "string" ? Number.parseInt(height, 10) : typeof height === "number" ? height : undefined;
            return (
              <OptimizedImage
                src={typeof src === "string" ? src : ""}
                alt={alt ?? ""}
                width={Number.isFinite(parsedWidth) ? parsedWidth : undefined}
                height={Number.isFinite(parsedHeight) ? parsedHeight : undefined}
              />
            );
          },
          a: ({ href, children }) => (
            <a href={href} className="text-primary underline hover:no-underline" target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}>
              {children}
            </a>
          ),
        }}
      >
        {removeDuplicateMarkdownTitle(content ?? "", pageTitle)}
      </ReactMarkdown>
    </div>
  );
}
