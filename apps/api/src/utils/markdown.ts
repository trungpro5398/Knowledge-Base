import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface CompileResult {
  html: string;
  toc: TocItem[];
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeHighlight)
  .use(rehypeSanitize)
  .use(rehypeStringify);

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function extractToc(md: string): TocItem[] {
  const toc: TocItem[] = [];
  const lines = md.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1]!.length;
      const text = match[2]!.trim();
      toc.push({ id: slugify(text), text, level });
    }
  }
  return toc;
}

export async function compileMarkdown(md: string): Promise<CompileResult> {
  const content = md ?? "";
  const toc = extractToc(content);
  const file = await processor.process(content);
  const html = String(file);
  return { html, toc };
}
