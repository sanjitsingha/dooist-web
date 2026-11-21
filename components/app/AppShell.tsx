"use client";

import { X } from "lucide-react";
import { createContext, use, useMemo, useState, type ReactNode } from "react";

import { BottomNav, Sidebar } from "@/components/app/AppNav";
import { AddTodoSheet } from "@/components/home/TodoSheets";
import { useToday } from "@/hooks/useToday";
import { useTodos } from "@/hooks/useTodos";
import type { DateKey } from "@/lib/dates";
import type { CurrentUser } from "@/lib/session";

type AppValue = ReturnType<typeof useTodos> & {
  user: CurrentUser;
  /** Null until the browser has said what day it is. */
  today: DateKey | null;
  selected: DateKey | null;
  /** Picks a day. Null goes back to following today. */
  selectDate: (date: DateKey | null) => void;
  showError: (message: string) => void;
};

const AppContext = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const value = use(AppContext);
  if (!value) throw new Error("useApp must be used inside <AppShell>");
  return value;
}

/**
 * The frame around every signed-in page: the side nav (a bottom bar on phones), the Add todo
 * sheet, and the todos and picked day, which all carry over from page to page.
 */
export function AppShell({
  user,
  version,
  children,
}: {
  user: CurrentUser;
  version: string;
  children: ReactNode;
}) {
  const today = useToday();
  const todos = useTodos(user.id);
  // Until a day is picked, it follows today, including past midnight.
  const [picked, setPicked] = useState<DateKey | null>(null);
  const [adding, setAdding] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const selected = picked ?? today;
  const value = useMemo(
    () => ({ ...todos, user, today, selected, selectDate: setPicked, showError: setAccountError }),
    [todos, user, today, selected],
  );

  const { addTodo, saveError, clearSaveError } = todos;
  const openAdd = () => setAdding(true);
  const message = saveError ?? accountError;

  return (
    <AppContext value={value}>
      <div className="flex min-h-dvh flex-1">
        <Sidebar
          user={user}
          version={version}
          onAdd={openAdd}
          onSync={todos.sync}
          onError={setAccountError}
        />
        <main className="min-w-0 flex-1 pb-24 md:pb-10">{children}</main>
        <BottomNav onAdd={openAdd} />

        {adding && today && selected ? (
          <AddTodoSheet
            today={today}
            startDate={selected}
            onClose={() => setAdding(false)}
            onAdd={(todo) => {
              addTodo(todo);
              // Show the todo's day, so the new todo is visible on Today right away.
              setPicked(todo.dueDate === today ? null : todo.dueDate);
              setAdding(false);
            }}
          />
        ) : null}

        {message ? (
          <div
            role="alert"
            className="fixed inset-x-4 bottom-24 z-20 mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white md:bottom-6"
          >
            <span className="flex-1">{message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => {
                clearSaveError();
                setAccountError(null);
              }}
              className="cursor-pointer rounded-md p-1 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
    </AppContext>
  );
}
