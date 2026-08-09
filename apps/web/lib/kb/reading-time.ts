const WORDS_PER_MINUTE = 220;

function readableText(source: string): string {
  return source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, " ")
    .replace(/[-`*_>#~|]/g, " ");
}

export function estimateReadingMinutes(source: string): number {
  const words = readableText(source).match(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
