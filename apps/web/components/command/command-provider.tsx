"use client";

import { useEffect, useState } from "react";
import { CommandMenu } from "./command-menu";
import { PublicSearchDialog } from "@/components/search/PublicSearchDialog";

export function CommandProvider({
  children,
  isLoggedIn,
}: {
  children: React.ReactNode;
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const openSearch = () => setOpen(true);
    window.addEventListener("kb:open-search", openSearch);
    return () => window.removeEventListener("kb:open-search", openSearch);
  }, []);

  return (
    <>
      {children}
      {isLoggedIn ? (
        <CommandMenu open={open} onOpenChange={setOpen} />
      ) : (
        <PublicSearchDialog open={open} onOpenChange={setOpen} />
      )}
    </>
  );
}
