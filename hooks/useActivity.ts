"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildActivity, type ActivityRow } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import type { Todo } from "@/lib/todos";

const PAGE_SIZE = 500;
const COLUMNS = "id,title,created_at,updated_at,completed,completed_at,deleted_at";

/** Every row, deleted ones too, since a delete is part of the history. */
async function fetchRows(userId: string): Promise<ActivityRow[]> {
  const supabase = createClient();
  const rows: ActivityRow[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("todos")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("id")
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

/** The account's activity. It reloads whenever the todos change, once the change is saved. */
export function useActivity(
  userId: string,
  todos: readonly Todo[],
  whenSaved: () => Promise<void>,
) {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const latest = useRef(0);

  const load = useCallback(() => {
    const run = ++latest.current;
    return whenSaved()
      .then(() => fetchRows(userId))
      .then(
        (next) => {
          if (run !== latest.current) return;
          setRows(next);
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
  }, [load, todos]);

  const retry = useCallback(() => {
    setStatus("loading");
    void load();
  }, [load]);

  const events = useMemo(() => buildActivity(rows), [rows]);
  return { events, status, retry };
}
