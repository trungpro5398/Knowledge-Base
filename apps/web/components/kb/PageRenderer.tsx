import ReactMarkdown from "react-markdown";
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
  return (
    <div className="prose-kb">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h2: ({ children }) => {
            const text = Array.isArray(children) ? children.join("") : String(children ?? "");
            const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
            return <h2 id={id}>{children}</h2>;
          },
          h3: ({ children }) => {
            const text = Array.isArray(children) ? children.join("") : String(children ?? "");
            const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
            return <h3 id={id}>{children}</h3>;
          },
          img: ({ src, alt, width, height }) => {
            const parsedWidth =
              typeof width === "string" ? Number.parseInt(width, 10) : typeof width === "number" ? width : undefined;
            const parsedHeight =
              typeof height === "string" ? Number.parseInt(height, 10) : typeof height === "number" ? height : undefined;
            return (
              <OptimizedImage
                src={src ?? ""}
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
