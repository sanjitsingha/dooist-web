import type { DateKey } from "@/lib/dates";
import type { Todo } from "@/lib/todos";

/** A todo with its text prepared once, so each keystroke only has to compare. */
export type IndexedTodo = {
  todo: Todo;
  title: string;
  description: string;
  day: number;
};

export type TodoMatch = {
  todo: Todo;
  /** Some of the words were only found in its description, so that's worth showing. */
  inDescription: boolean;
};

export type TextPart = { text: string; hit: boolean };

const DAY_MS = 24 * 60 * 60 * 1000;
const WORD_CHARACTER = /[\p{L}\p{N}]/u;
const MARKS = /\p{M}/gu;

/** Ignores capitals and accents, so "cafe" finds "Café". */
function foldCharacter(text: string): string {
  return text.normalize("NFKD").replace(MARKS, "").toLowerCase();
}

function foldText(text: string): string {
  return foldCharacter(text).replace(/\s+/g, " ").trim();
}

function dayNumber(day: DateKey): number {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date) / DAY_MS;
}

export function buildTodoIndex(todos: readonly Todo[]): IndexedTodo[] {
  return todos.map((todo) => ({
    todo,
    title: foldText(todo.title),
    description: foldText(todo.description ?? ""),
    day: dayNumber(todo.dueDate),
  }));
}

/** The separate words of a search, each of which a todo has to contain. */
export function queryTerms(query: string): string[] {
  return [...new Set(foldText(query).split(" ").filter(Boolean))];
}

/** 3 for a whole word, 2 for the start of a word, 1 for inside a word, 0 for not found. */
function matchStrength(text: string, term: string): number {
  let best = 0;
  for (let at = text.indexOf(term); at !== -1; at = text.indexOf(term, at + 1)) {
    if (at > 0 && WORD_CHARACTER.test(text[at - 1])) {
      best = Math.max(best, 1);
      continue;
    }
    const end = at + term.length;
    if (end === text.length || !WORD_CHARACTER.test(text[end])) return 3;
    best = 2;
  }
  return best;
}

/**
 * Every todo containing all the words, in its title or description. Title matches come first, then
 * open todos before finished ones, then whichever is due closest to today.
 */
export function searchTodos(
  index: readonly IndexedTodo[],
  query: string,
  today: DateKey,
): TodoMatch[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const phrase = foldText(query);
  const todayNumber = dayNumber(today);
  const found: { entry: IndexedTodo; score: number; inDescription: boolean }[] = [];

  for (const entry of index) {
    let score = 0;
    let inDescription = false;
    let matchesAll = true;
    for (const term of terms) {
      const inTitle = matchStrength(entry.title, term);
      if (inTitle > 0) {
        score += 10 + inTitle * 10;
        continue;
      }
      const inText = matchStrength(entry.description, term);
      if (inText === 0) {
        matchesAll = false;
        break;
      }
      score += inText * 3;
      inDescription = true;
    }
    if (!matchesAll) continue;
    if (entry.title === phrase) score += 100;
    else if (entry.title.startsWith(phrase)) score += 50;
    found.push({ entry, score, inDescription });
  }

  found.sort(
    (a, b) =>
      b.score - a.score ||
      Number(a.entry.todo.completed) - Number(b.entry.todo.completed) ||
      Math.abs(a.entry.day - todayNumber) - Math.abs(b.entry.day - todayNumber) ||
      a.entry.title.localeCompare(b.entry.title),
  );
  return found.map(({ entry, inDescription }) => ({ todo: entry.todo, inDescription }));
}

/** Splits text into the parts that match the search and the parts that don't. */
export function highlightParts(text: string, terms: readonly string[]): TextPart[] {
  let folded = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let position = 0;
  for (const character of text) {
    const next = foldCharacter(character);
    for (let i = 0; i < next.length; i++) {
      starts.push(position);
      ends.push(position + character.length);
    }
    folded += next;
    position += character.length;
  }

  const ranges: [number, number][] = [];
  for (const term of terms) {
    for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + 1)) {
      ranges.push([starts[at], ends[at + term.length - 1]]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);

  const parts: TextPart[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (end <= cursor) continue;
    const from = Math.max(start, cursor);
    if (from > cursor) parts.push({ text: text.slice(cursor, from), hit: false });
    parts.push({ text: text.slice(from, end), hit: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
  return parts;
}

/** A long description, starting just before its first match so the match stays visible. */
export function descriptionSnippet(text: string, terms: readonly string[]): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const parts = highlightParts(clean, terms);
  const firstHit = parts.findIndex((part) => part.hit);
  if (firstHit === -1) return clean;
  const offset = parts.slice(0, firstHit).reduce((length, part) => length + part.text.length, 0);
  if (offset <= 28) return clean;
  let start = offset - 28;
  // Never start halfway through an emoji.
  const code = clean.charCodeAt(start);
  if (code >= 0xdc00 && code <= 0xdfff) start += 1;
  return `…${clean.slice(start).trimStart()}`;
}
