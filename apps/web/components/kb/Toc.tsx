"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TocProps {
  headings?: string[];
  items?: TocItem[];
}

export function Toc({ headings, items: tocItems }: TocProps) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveId(e.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );
    document.querySelectorAll("h2, h3").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const items = tocItems ?? (headings ?? []).map((h) => {
    const match = h.match(/^(#{1,3})\s+(.+)$/);
    if (!match) return null;
    const [, hashes, text] = match;
    const level = hashes.length;
    const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return { id, text, level };
  }).filter(Boolean) as TocItem[];

  return (
    <nav className="border-l pl-4" aria-label="On this page">
      <h3 className="font-semibold mb-2">On this page</h3>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li
            key={item.id}
            style={{ paddingLeft: (item.level - 1) * 12 }}
            className={activeId === item.id ? "text-primary font-medium" : ""}
          >
            <a href={`#${item.id}`} className="hover:underline">
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
