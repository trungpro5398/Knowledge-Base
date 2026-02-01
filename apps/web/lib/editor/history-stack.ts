export interface HistoryEntry {
  content: string;
  timestamp: number;
}

export class HistoryStack {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  push(content: string): void {
    // Remove any history after current index (when user undoes then types)
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add new entry
    this.history.push({
      content,
      timestamp: Date.now(),
    });

    // Trim if exceeds max size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
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
  }

  initialize(content: string): void {
    this.clear();
    this.push(content);
  }
}
