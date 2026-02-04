import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { OptimizedImage } from "./OptimizedImage";

interface PageRendererProps {
  content?: string;
  html?: string;
}

export function PageRenderer({ content, html }: PageRendererProps) {
  if (html) {
    return <div className="prose-kb" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
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
      {content ?? ""}
    </ReactMarkdown>
  );
}
