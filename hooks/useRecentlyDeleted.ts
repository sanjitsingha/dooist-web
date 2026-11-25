"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { TodoRow } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { fromRow, type Todo } from "@/lib/todos";

/** How far back Recently deleted goes. Older deletes stay in the account, for its history. */
export const RECENTLY_DELETED_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 500;

export type DeletedTodo = { todo: Todo; deletedAt: number };

/** The account's todos deleted in the last 30 days, the latest first. */
async function fetchDeleted(userId: string): Promise<DeletedTodo[]> {
  const supabase = createClient();
  const since = new Date(Date.now() - RECENTLY_DELETED_DAYS * DAY).toISOString();
  const rows: TodoRow[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .gte("deleted_at", since)
      .order("deleted_at", { ascending: false })
      .order("id")
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows.map((row) => ({ todo: fromRow(row), deletedAt: Date.parse(row.deleted_at ?? "") }));
}

/**
 * Recently deleted todos, loaded once this browser's own changes have been saved, so a todo
 * deleted a moment ago is in the list. Restoring one takes it out of the list straight away.
 */
export function useRecentlyDeleted(
  userId: string,
  whenSaved: () => Promise<void>,
  restoreTodo: (todo: Todo) => void,
) {
  const [todos, setTodos] = useState<DeletedTodo[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const latest = useRef(0);

  const load = useCallback(() => {
    const run = ++latest.current;
    return whenSaved()
      .then(() => fetchDeleted(userId))
      .then(
        (next) => {
          if (run !== latest.current) return;
          setTodos(next);
          setStatus("ready");
        },
        () => {
          // A failed background reload keeps what's on screen.
          if (run !== latest.current) return;
          setStatus((current) => (current === "ready" ? current : "error"));
        },
      );
  }, [userId, whenSaved]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(() => {
    setStatus("loading");
    void load();
  }, [load]);

  const restore = useCallback(
    (todo: Todo) => {
      setTodos((current) => current.filter((deleted) => deleted.todo.id !== todo.id));
      restoreTodo(todo);
      // Once it's saved: if it didn't go through, it comes back into the list.
      void load();
    },
    [load, restoreTodo],
  );

  return { todos, status, retry, restore };
}
