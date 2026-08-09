"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

export function CommandProvider({
  children,
  isLoggedIn,
}: {
  children: React.ReactNode;
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [Dialog, setDialog] = useState<ComponentType<DialogProps> | null>(null);
  const dialogPromise = useRef<Promise<ComponentType<DialogProps>> | null>(null);
  const dialogMode = useRef<boolean | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
    }
    setOpen(nextOpen);
    if (!nextOpen) {
      window.requestAnimationFrame(() => previouslyFocused.current?.focus());
    }
  }, []);

  const openDialog = useCallback(async () => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    if (dialogMode.current !== isLoggedIn) {
      dialogMode.current = isLoggedIn;
      dialogPromise.current = null;
      setDialog(null);
    }
    if (!dialogPromise.current) {
      dialogPromise.current = isLoggedIn
        ? import("./command-menu").then((module) => module.CommandMenu)
        : import("@/components/search/PublicSearchDialog").then((module) => module.PublicSearchDialog);
    }
    const LoadedDialog = await dialogPromise.current;
    setDialog(() => LoadedDialog);
    setOpen(true);
  }, [isLoggedIn]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (open) handleOpenChange(false);
        else void openDialog();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [handleOpenChange, open, openDialog]);

  useEffect(() => {
    const openSearch = () => void openDialog();
    window.addEventListener("kb:open-search", openSearch);
    return () => window.removeEventListener("kb:open-search", openSearch);
  }, [openDialog]);

  return (
    <>
      {children}
      {open && Dialog && <Dialog open onOpenChange={handleOpenChange} />}
    </>
  );
}
