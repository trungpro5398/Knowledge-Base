export interface HistoryEntry {
  content: string;
  timestamp: number;
}

export class HistoryStack {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private readonly maxSize: number;
  private readonly maxCharacters: number;
  private totalCharacters = 0;

  constructor(maxSize: number = 50, maxCharacters: number = 5_000_000) {
    this.maxSize = maxSize;
    this.maxCharacters = maxCharacters;
  }

  push(content: string): void {
    if (this.history[this.currentIndex]?.content === content) return;

    // Remove any history after current index (when user undoes then types)
    const discarded = this.history.splice(this.currentIndex + 1);
    for (const entry of discarded) this.totalCharacters -= entry.content.length;

    // Add new entry
    this.history.push({
      content,
      timestamp: Date.now(),
    });
    this.totalCharacters += content.length;
    this.currentIndex = this.history.length - 1;

    // Bound retained text as well as entry count. A single large current
    // document is always kept so undo state remains internally consistent.
    while (
      this.history.length > 1 &&
      (this.history.length > this.maxSize || this.totalCharacters > this.maxCharacters)
    ) {
      const removed = this.history.shift();
      if (removed) this.totalCharacters -= removed.content.length;
    }
    this.currentIndex = this.history.length - 1;
  }

  undo(): string | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex].content;
    }
    return null;
  }

  redo(): string | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex].content;
    }
    return null;
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.totalCharacters = 0;
  }

  initialize(content: string): void {
    this.clear();
    this.push(content);
  }
}
