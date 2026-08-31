import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
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

function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function headingSlug(baseId: string, count: number): string {
  return count === 0 ? baseId : `${baseId}-${count + 1}`;
}

function headingId(baseId: string, count: number): string {
  return `user-content-${headingSlug(baseId, count)}`;
}

function getHeadingText(node: MarkdownNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(getHeadingText).join("");
}

interface MarkdownNode {
  type?: string;
  tagName?: string;
  value?: string;
  children?: MarkdownNode[];
  properties?: Record<string, unknown>;
}

function applyHeadingIds() {
  return (tree: MarkdownNode) => {
    const counts = new Map<string, number>();
    const visit = (node: MarkdownNode) => {
      if (node.type === "element" && ["h1", "h2", "h3"].includes(node.tagName ?? "")) {
        const baseId = slugify(getHeadingText(node));
        const count = counts.get(baseId) ?? 0;
        counts.set(baseId, count + 1);
        node.properties = { ...node.properties, id: headingSlug(baseId, count) };
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

function plainHeadingText(value: string): string {
  return value
    .replace(/\s+#+\s*$/, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();
}

// Highlighting is disproportionately expensive and can expand a very large
// code document several-fold. Preserve it for normal documentation while
// keeping unusually large publishes bounded and responsive.
const MAX_HIGHLIGHTED_MARKDOWN_CHARS = 250_000;

function createProcessor(highlight: boolean) {
  const pipeline = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(applyHeadingIds);
  if (highlight) pipeline.use(rehypeHighlight);
  return pipeline.use(rehypeSanitize).use(rehypeStringify);
}

const highlightedProcessor = createProcessor(true);
const largeDocumentProcessor = createProcessor(false);

function extractToc(md: string): TocItem[] {
  const toc: TocItem[] = [];
  const counts = new Map<string, number>();
  const lines = md.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1]!.length;
      const text = plainHeadingText(match[2]!);
      const baseId = slugify(text);
      const count = counts.get(baseId) ?? 0;
      counts.set(baseId, count + 1);
      toc.push({ id: headingId(baseId, count), text, level });
    }
  }
  return toc;
}

export async function compileMarkdown(md: string): Promise<CompileResult> {
  const content = md ?? "";
  const toc = extractToc(content);
  const processor = content.length <= MAX_HIGHLIGHTED_MARKDOWN_CHARS
    ? highlightedProcessor
    : largeDocumentProcessor;
  const file = await processor.process(content);
  const html = String(file);
  return { html, toc };
}
