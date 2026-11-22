"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { TodoRow } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import {
  createId,
  fromRow,
  toPatch,
  toRow,
  type NewTodo,
  type Todo,
  type TodoChanges,
} from "@/lib/todos";

const PAGE_SIZE = 500;
const SAVE_FAILED = "Couldn’t save that. Check your connection and try again.";

type WriteResult = { data: TodoRow | null; error: unknown };

async function fetchTodos(userId: string): Promise<TodoRow[]> {
  const supabase = createClient();
  const rows: TodoRow[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("id")
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

/**
 * The signed-in person's todos from the account the Android app syncs to. Changes show at once
 * and are sent in order. If one fails, the list goes back to what the account really holds.
 * Coming back to the tab reloads, to pick up changes made on the phone.
 */
export function useTodos(userId: string) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saveError, setSaveError] = useState<string | null>(null);

  /** What the account is known to hold. */
  const saved = useRef(new Map<string, Todo>());
  const queue = useRef<Promise<void>>(Promise.resolve());
  const unsent = useRef(0);
  const writesStarted = useRef(0);
  const anyFailed = useRef(false);
  const reading = useRef<Promise<TodoRow[]> | null>(null);

  /** The account's rows once nothing is left to send. Callers share a read already running. */
  const read = useCallback(() => {
    reading.current ??= (async () => {
      try {
        for (;;) {
          await queue.current;
          const writesAtStart = writesStarted.current;
          const rows = await fetchTodos(userId);
          // A change made while this was loading isn't in these rows: wait for it, and load again.
          if (unsent.current === 0 && writesStarted.current === writesAtStart) return rows;
        }
      } finally {
        reading.current = null;
      }
    })();
    return reading.current;
  }, [userId]);

  const showRows = useCallback((rows: TodoRow[]) => {
    const next = rows.map(fromRow);
    saved.current = new Map(next.map((todo) => [todo.id, todo]));
    setTodos(next);
    setStatus("ready");
  }, []);

  const load = useCallback(
    () =>
      read().then(
        showRows,
        // A failed background reload keeps what's on screen.
        () => setStatus((current) => (current === "ready" ? current : "error")),
      ),
    [read, showRows],
  );

  /** Brings in the account's latest now. False if it couldn't be reached. */
  const sync = useCallback(
    () =>
      read().then(
        (rows) => {
          showRows(rows);
          return true;
        },
        () => false,
      ),
    [read, showRows],
  );

  useEffect(() => {
    void load();
    const reload = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", reload);
    return () => {
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", reload);
    };
  }, [load]);

  const retry = useCallback(() => {
    setStatus("loading");
    void load();
  }, [load]);

  const write = useCallback(
    (show: (current: Todo[]) => Todo[], send: () => PromiseLike<WriteResult>) => {
      writesStarted.current += 1;
      unsent.current += 1;
      setSaveError(null);
      setTodos(show);

      queue.current = queue.current.then(async () => {
        let row: TodoRow | null = null;
        try {
          const result = await send();
          if (!result.error) row = result.data;
        } catch {
          // Handled below, the same as an error from Supabase.
        }
        if (row?.deleted_at) saved.current.delete(row.id);
        else if (row) saved.current.set(row.id, fromRow(row));
        else anyFailed.current = true;

        unsent.current -= 1;
        if (unsent.current === 0 && anyFailed.current) {
          anyFailed.current = false;
          setTodos([...saved.current.values()]);
          setSaveError(SAVE_FAILED);
        }
      });
    },
    [],
  );

  const addTodo = useCallback(
    (todo: NewTodo) => {
      const created: Todo = { ...todo, id: createId(), completed: false, createdAt: Date.now() };
      write(
        (current) => [...current, created],
        () => createClient().from("todos").insert(toRow(created, userId)).select().single(),
      );
    },
    [userId, write],
  );

  const updateTodo = useCallback(
    (id: string, changes: TodoChanges) => {
      write(
        (current) => current.map((todo) => (todo.id === id ? { ...todo, ...changes } : todo)),
        () =>
          createClient()
            .from("todos")
            .update(toPatch(changes))
            .eq("user_id", userId)
            .eq("id", id)
            .select()
            .maybeSingle(),
      );
    },
    [userId, write],
  );

  const toggleTodo = useCallback(
    (target: Todo) => {
      const completed = !target.completed;
      const completedAt = completed ? Date.now() : undefined;
      write(
        (current) =>
          current.map((todo) => (todo.id === target.id ? { ...todo, completed, completedAt } : todo)),
        () =>
          createClient()
            .from("todos")
            .update({
              completed,
              completed_at: completedAt ? new Date(completedAt).toISOString() : null,
            })
            .eq("user_id", userId)
            .eq("id", target.id)
            .select()
            .maybeSingle(),
      );
    },
    [userId, write],
  );

  /** Marks it deleted in the account, like the Android app, so its history and other devices see it. */
  const deleteTodo = useCallback(
    (id: string) => {
      write(
        (current) => current.filter((todo) => todo.id !== id),
        () =>
          createClient()
            .from("todos")
            .update({ deleted_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("id", id)
            .select()
            .maybeSingle(),
      );
    },
    [userId, write],
  );

  const clearSaveError = useCallback(() => setSaveError(null), []);
  /** Resolves once every change made so far has been sent. */
  const whenSaved = useCallback(() => queue.current, []);

  return {
    todos,
    status,
    saveError,
    clearSaveError,
    retry,
    sync,
    whenSaved,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
  };
}
