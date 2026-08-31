import assert from "node:assert/strict";
import test from "node:test";
import { HistoryStack } from "./history-stack";

test("keeps normal undo and redo history", () => {
  const history = new HistoryStack(3, 100);
  history.initialize("one");
  history.push("two");
  history.push("three");

  assert.equal(history.undo(), "two");
  assert.equal(history.undo(), "one");
  assert.equal(history.redo(), "two");
});

test("bounds retained document characters while keeping the current value", () => {
  const history = new HistoryStack(50, 10);
  history.initialize("123456");
  history.push("abcdef");

  assert.equal(history.canUndo(), false);
  assert.equal(history.undo(), null);
  assert.equal(history.canRedo(), false);
});

test("discards redo entries without corrupting the character budget", () => {
  const history = new HistoryStack(10, 12);
  history.initialize("aaa");
  history.push("bbb");
  history.push("ccc");
  assert.equal(history.undo(), "bbb");

  history.push("ddd");
  assert.equal(history.undo(), "bbb");
  assert.equal(history.undo(), "aaa");
});
