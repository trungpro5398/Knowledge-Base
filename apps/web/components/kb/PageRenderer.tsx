import ReactMarkdown from "react-markdown";
import { isValidElement, type ReactNode } from "react";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { OptimizedImage } from "./OptimizedImage";

interface PageRendererProps {
  content?: string;
  html?: string;
  pageTitle?: string;
}

function normalizeHeadingText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function slugifyHeading(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function headingId(baseId: string, count: number): string {
  const suffix = count === 0 ? baseId : `${baseId}-${count + 1}`;
  return `user-content-${suffix}`;
}

function getNodeText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(getNodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(value)) return getNodeText(value.props.children);
  return "";
}

function removeDuplicateHtmlTitle(html: string, pageTitle?: string): string {
  if (!pageTitle) return html;
  const normalizedTitle = normalizeHeadingText(pageTitle);
  return html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, (heading) =>
    normalizeHeadingText(heading) === normalizedTitle ? "" : heading
  );
}

function removeDuplicateMarkdownTitle(content: string, pageTitle?: string): string {
  if (!pageTitle) return content;
  const lines = content.split("\n");
  const firstContentLine = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentLine === -1) return content;

  const match = lines[firstContentLine]!.match(/^#\s+(.+?)\s*#*\s*$/);
  if (!match || normalizeHeadingText(match[1]!) !== normalizeHeadingText(pageTitle)) {
    return content;
  }

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
