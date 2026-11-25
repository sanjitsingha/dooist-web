"use client";

import { X } from "lucide-react";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

import { AccountSheet } from "@/components/app/AccountSheet";
import { BottomNav, Sidebar } from "@/components/app/AppNav";
import { NotificationsSheet } from "@/components/app/NotificationsSheet";
import { SearchSheet } from "@/components/app/SearchSheet";
import { SettingsSheet } from "@/components/app/SettingsSheet";
import { AddTodoSheet } from "@/components/home/TodoSheets";
import { useAddTodoShortcut } from "@/hooks/useAddTodoShortcut";
import { useAppearance } from "@/hooks/useAppearance";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useNotifications } from "@/hooks/useNotifications";
import { useToday } from "@/hooks/useToday";
import { useTodos } from "@/hooks/useTodos";
import type { DateKey, TimeKey } from "@/lib/dates";
import type { CurrentUser } from "@/lib/session";

type AppValue = ReturnType<typeof useTodos> & {
  user: CurrentUser;
  /** Null until the browser has said what day it is. */
  today: DateKey | null;
  selected: DateKey | null;
  /** Picks a day. Null goes back to following today. */
  selectDate: (date: DateKey | null) => void;
  /** Opens Add todo on this day, at this time (a slot clicked on a timeline). */
  openAddAt: (date: DateKey, time: TimeKey) => void;
};

/** Add todo, while it's open: on the picked day, or on a day and time clicked on a timeline. */
type Adding = { date: DateKey | null; time?: TimeKey };

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
  const [adding, setAdding] = useState<Adding | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { appearance, setAppearance } = useAppearance(user.id);
  const alerts = useNotifications(user.id, todos.todos, version);
  const [accountError, setAccountError] = useState<string | null>(null);

  const selected = picked ?? today;
  const openAddAt = useCallback((date: DateKey, time: TimeKey) => setAdding({ date, time }), []);
  const value = useMemo(
    () => ({ ...todos, user, today, selected, selectDate: setPicked, openAddAt }),
    [todos, user, today, selected, openAddAt],
  );

  const { addTodo, saveError, clearSaveError } = todos;
  const openAdd = useCallback(() => setAdding({ date: null }), []);
  const openAccount = () => setAccountOpen(true);
  const openNotifications = useCallback(() => {
    setAccountOpen(false);
    setSettingsOpen(false);
    setSearchOpen(false);
    setNotificationsOpen(true);
  }, []);
  useBrowserNotifications(user.id, alerts.notifications, alerts.now, openNotifications);
  const openSettings = () => {
    setAccountOpen(false);
    setSearchOpen(false);
    setSettingsOpen(true);
  };
  const openSearch = () => {
    setAccountOpen(false);
    setSearchOpen(true);
  };
  useAddTodoShortcut(openAdd);
  const message = saveError ?? accountError;

  return (
    <AppContext value={value}>
      <div className="flex min-h-dvh flex-1">
        <Sidebar
          user={user}
          version={version}
          onAdd={openAdd}
          onSearch={openSearch}
          onSync={todos.sync}
          onError={setAccountError}
          onOpenProfile={openAccount}
          onOpenSettings={openSettings}
          unreadNotifications={alerts.unread}
          onOpenNotifications={openNotifications}
        />
        <main className="min-w-0 flex-1 pb-24 md:pb-10">{children}</main>
        <BottomNav onAdd={openAdd} onOpenProfile={openAccount} />

        {adding && today && selected ? (
          <AddTodoSheet
            today={today}
            startDate={adding.date ?? selected}
            startTime={adding.time}
            onClose={() => setAdding(null)}
            onAdd={(todo) => {
              addTodo(todo);
              // Show the todo's day, so the new todo is visible on Today right away.
              setPicked(todo.dueDate === today ? null : todo.dueDate);
              setAdding(null);
            }}
          />
        ) : null}

        {accountOpen ? (
          <AccountSheet
            user={user}
            unreadNotifications={alerts.unread}
            onOpenNotifications={openNotifications}
            onOpenSearch={openSearch}
            onOpenSettings={openSettings}
            onClose={() => setAccountOpen(false)}
          />
        ) : null}

        {searchOpen ? (
          <SearchSheet
            user={user}
            todos={todos.todos}
            todosStatus={todos.status}
            today={today}
            onRetryTodos={todos.retry}
            onUpdateTodo={todos.updateTodo}
            onToggleTodo={todos.toggleTodo}
            onDeleteTodo={todos.deleteTodo}
            onAppearanceChange={setAppearance}
            onOpenSettings={openSettings}
            onClose={() => setSearchOpen(false)}
          />
        ) : null}

        {settingsOpen ? (
          <SettingsSheet
            user={user}
            appearance={appearance}
            onAppearanceChange={setAppearance}
            whenSaved={todos.whenSaved}
            onRestoreTodo={todos.restoreTodo}
            version={version}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}

        {notificationsOpen ? (
          <NotificationsSheet
            notifications={alerts.notifications}
            unread={alerts.unread}
            now={alerts.now}
            onRead={alerts.markRead}
            onReadAll={alerts.markAllRead}
            onClose={() => setNotificationsOpen(false)}
          />
        ) : null}

        {message ? (
          <div
            role="alert"
            className="fixed inset-x-4 bottom-24 z-20 mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-on-ink md:bottom-6"
          >
            <span className="flex-1">{message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => {
                clearSaveError();
                setAccountError(null);
              }}
              className="cursor-pointer rounded-md p-1 hover:bg-on-ink/10 focus-visible:outline-2 focus-visible:outline-on-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
    </AppContext>
  );
}
