"use client";

import {
  Bell,
  Circle,
  CircleCheck,
  ListTodo,
  Megaphone,
  Moon,
  Search,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { PAGES } from "@/components/app/AppNav";
import { NOTIFICATION_KINDS } from "@/components/app/SettingsSheet";
import { SwitchTrack } from "@/components/app/SwitchTrack";
import { ErrorMessage } from "@/components/auth/AuthButtons";
import { dueLabel } from "@/components/home/TodoCard";
import { TodoDetailsSheet } from "@/components/home/TodoSheets";
import { Sheet } from "@/components/home/Sheet";
import { Pagination } from "@/components/reporting/Pagination";
import { useIsDark } from "@/hooks/useAppearance";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { fromDateKey, type DateKey } from "@/lib/dates";
import type { NotificationKind } from "@/lib/notifications";
import type { CurrentUser } from "@/lib/session";
import type { Appearance } from "@/lib/theme";
import {
  buildTodoIndex,
  descriptionSnippet,
  highlightParts,
  queryTerms,
  searchTodos,
  type TodoMatch,
} from "@/lib/todoSearch";
import { priorityOf, type Todo, type TodoChanges } from "@/lib/todos";

/** Only one page of todos is in the modal at a time, so a broad search stays light. */
const TODO_PAGE_SIZE = 25;

type Item = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Other words that should find it. */
  keywords?: string;
} & (
  | { type: "link"; href: string }
  | { type: "action"; run: () => void }
  | { type: "switch"; checked: boolean; toggle: () => void }
);

const KIND_ICONS: Record<NotificationKind, LucideIcon> = {
  reminder: Bell,
  due: ListTodo,
  update: Megaphone,
};

const ROW =
  "flex h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 text-left text-[15px] text-text transition-colors hover:bg-field focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

function Row({ item, onNavigate }: { item: Item; onNavigate: () => void }) {
  const { icon: Icon, label } = item;
  const content = (
    <>
      <Icon aria-hidden="true" className="size-5 shrink-0 text-ink" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {item.type === "switch" ? <SwitchTrack checked={item.checked} /> : null}
    </>
  );

  if (item.type === "link") {
    return (
      <Link href={item.href} onClick={onNavigate} className={ROW}>
        {content}
      </Link>
    );
  }
  if (item.type === "switch") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={item.checked}
        aria-label={label}
        onClick={item.toggle}
        className={ROW}
      >
        {content}
      </button>
    );
  }
  return (
    <button type="button" aria-haspopup="dialog" onClick={item.run} className={ROW}>
      {content}
    </button>
  );
}

function Group({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: readonly Item[];
  onNavigate: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="pb-2">
      <h3 className="px-2.5 pt-2 pb-1 text-[13px] font-semibold text-muted">{title}</h3>
      {items.map((item) => (
        <Row key={item.id} item={item} onNavigate={onNavigate} />
      ))}
    </section>
  );
}

function Highlighted({ text, terms }: { text: string; terms: readonly string[] }) {
  return highlightParts(text, terms).map((part, index) =>
    part.hit ? (
      <mark key={index} className="rounded-sm bg-accent-soft text-accent-dark">
        {part.text}
      </mark>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );
}

/** One found todo: done or not, its title and date, and the description if that's what matched. */
function TodoResult({
  match: { todo, inDescription },
  terms,
  now,
  onOpen,
}: {
  match: TodoMatch;
  terms: readonly string[];
  now: Date;
  onOpen: (todo: Todo) => void;
}) {
  const label = dueLabel(todo, now);
  const meta = todo.completed ? `Completed · ${label}` : label;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`${todo.title}, ${meta}. Open details`}
      onClick={() => onOpen(todo)}
      className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-field focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
    >
      {todo.completed ? (
        <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
      ) : (
        <Circle
          aria-hidden="true"
          className={`mt-0.5 size-5 shrink-0 ${priorityOf(todo.priority).title}`}
        />
      )}
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[15px] ${
            todo.completed ? "text-muted line-through" : "text-text"
          }`}
        >
          <Highlighted text={todo.title} terms={terms} />
        </span>
        {inDescription && todo.description ? (
          <span className="block truncate text-[13px] leading-[18px] text-muted">
            <Highlighted text={descriptionSnippet(todo.description, terms)} terms={terms} />
          </span>
        ) : null}
        <span className="mt-0.5 block truncate text-xs text-muted">{meta}</span>
      </span>
    </button>
  );
}

/**
 * Finds any of the account's todos, past, finished or new, and gets around or changes settings.
 * Typing brings what matches to the top, with the rest of the options below it.
 */
export function SearchSheet({
  user,
  todos,
  todosStatus,
  today,
  onRetryTodos,
  onUpdateTodo,
  onToggleTodo,
  onDeleteTodo,
  onAppearanceChange,
  onOpenSettings,
  onClose,
}: {
  user: CurrentUser;
  todos: readonly Todo[];
  todosStatus: "loading" | "ready" | "error";
  /** Null until the browser has said what day it is. */
  today: DateKey | null;
  onRetryTodos: () => void;
  onUpdateTodo: (id: string, changes: TodoChanges) => void;
  onToggleTodo: (todo: Todo) => void;
  onDeleteTodo: (id: string) => void;
  onAppearanceChange: (next: Appearance) => Promise<string | null>;
  onOpenSettings: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  /** Which page, for which search, so a new search always starts on the first page. */
  const [paging, setPaging] = useState({ search: "", page: 1 });
  const isDark = useIsDark();
  const { settings, setKind } = useNotificationSettings(user.id);

  useEffect(() => input.current?.focus(), []);

  // Typing stays instant, even when a very long list is being searched.
  const search = useDeferredValue(query);
  const index = useMemo(() => buildTodoIndex(todos), [todos]);
  const todoMatches = useMemo(
    () => (today ? searchTodos(index, search, today) : []),
    [index, search, today],
  );
  const terms = useMemo(() => queryTerms(search), [search]);
  const pageCount = Math.ceil(todoMatches.length / TODO_PAGE_SIZE);
  const todoPage = Math.max(1, Math.min(paging.search === search ? paging.page : 1, pageCount));
  const shownMatches = todoMatches.slice(
    (todoPage - 1) * TODO_PAGE_SIZE,
    todoPage * TODO_PAGE_SIZE,
  );
  const detailsTodo = openId ? todos.find((todo) => todo.id === openId) : undefined;

  const toggleDark = async () => {
    setError(null);
    setError(await onAppearanceChange(isDark ? "light" : "dark"));
  };

  const navigation: Item[] = [
    { id: "settings", type: "action", label: "Settings", icon: Settings, run: onOpenSettings },
    ...PAGES.map(
      ({ href, label, icon }): Item => ({ id: href, type: "link", href, label, icon }),
    ),
  ];
  const quickSettings: Item[] = [
    {
      id: "dark",
      type: "switch",
      label: "Dark mode",
      keywords: "appearance theme light",
      icon: Moon,
      checked: isDark,
      toggle: () => void toggleDark(),
    },
    ...NOTIFICATION_KINDS.map(
      ({ kind, title }): Item => ({
        id: kind,
        type: "switch",
        label: title,
        keywords: "notifications",
        icon: KIND_ICONS[kind],
        checked: settings[kind],
        toggle: () => setKind(kind, !settings[kind]),
      }),
    ),
  ];

  const needle = query.trim().toLowerCase();
  const results = needle
    ? [...navigation, ...quickSettings].filter((item) =>
        `${item.label} ${item.keywords ?? ""}`.toLowerCase().includes(needle),
      )
    : [];
  const found = new Set(results.map((item) => item.id));
  const notFound = (items: readonly Item[]) => items.filter((item) => !found.has(item.id));

  const runFirstResult = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    // What's typed right now, even if the list on screen is a moment behind.
    const firstTodo = today ? searchTodos(index, query, today)[0] : undefined;
    if (firstTodo) {
      setOpenId(firstTodo.todo.id);
      return;
    }
    const first = results[0];
    if (!first) return;
    if (first.type === "link") {
      router.push(first.href);
      onClose();
    } else if (first.type === "switch") {
      first.toggle();
    } else {
      first.run();
    }
  };

  return (
    <Sheet label="Search" flush onRequestClose={onClose}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-line pr-14 pl-5">
          <Search aria-hidden="true" className="size-5 shrink-0 text-muted" />
          <input
            ref={input}
            // A plain text field, because Chrome's search type makes Escape clear it, not close.
            type="text"
            role="searchbox"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={runFirstResult}
            aria-label="Search"
            placeholder="Search todos, pages and settings"
            enterKeyHint="search"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
              className="shrink-0 cursor-pointer rounded-md px-1.5 py-0.5 text-[13px] font-medium text-muted transition-colors hover:bg-field hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
            >
              <span className="sr-only">Clear search</span>
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        <div
          ref={scroller}
          className="min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]"
        >
          {error ? (
            <div className="px-2.5 py-1">
              <ErrorMessage message={error} />
            </div>
          ) : null}

          {needle && todosStatus === "loading" ? (
            <p role="status" className="px-2.5 py-3 text-sm text-muted">
              Loading your todos…
            </p>
          ) : null}
          {needle && todosStatus === "error" ? (
            <div role="alert" className="flex items-center gap-3 px-2.5 py-2">
              <span className="min-w-0 flex-1 text-sm text-muted">Couldn’t load your todos.</span>
              <button
                type="button"
                onClick={onRetryTodos}
                className="h-8 shrink-0 cursor-pointer rounded-lg bg-field px-3 text-sm font-semibold text-text transition-colors hover:bg-line focus-visible:outline-2 focus-visible:outline-ink"
              >
                Try again
              </button>
            </div>
          ) : null}
          {needle && todosStatus === "ready" && todoMatches.length === 0 && results.length === 0 ? (
            <p role="status" className="truncate px-2.5 py-3 text-sm text-muted">
              No results for “{query.trim()}”
            </p>
          ) : null}

          {needle && shownMatches.length > 0 ? (
            <section aria-label="Todos" className="pb-2">
              <h3 className="flex items-baseline gap-1.5 px-2.5 pt-2 pb-1 text-[13px] font-semibold text-muted">
                Todos
                <span className="font-normal">{todoMatches.length.toLocaleString()}</span>
              </h3>
              {today
                ? shownMatches.map((match) => (
                    <TodoResult
                      key={match.todo.id}
                      match={match}
                      terms={terms}
                      now={fromDateKey(today)}
                      onOpen={(todo) => setOpenId(todo.id)}
                    />
                  ))
                : null}
              <div className="px-2.5 pt-2 empty:hidden">
                <Pagination
                  page={todoPage}
                  pageSize={TODO_PAGE_SIZE}
                  total={todoMatches.length}
                  label="Todo result pages"
                  onChange={(page) => {
                    setPaging({ search, page });
                    scroller.current?.scrollTo({ top: 0 });
                  }}
                />
              </div>
            </section>
          ) : null}

          <Group title="Pages and settings" items={results} onNavigate={onClose} />
          <Group title="Navigation" items={notFound(navigation)} onNavigate={onClose} />
          <Group title="Settings" items={notFound(quickSettings)} onNavigate={onClose} />
        </div>
      </div>

      {detailsTodo && today ? (
        <TodoDetailsSheet
          key={detailsTodo.id}
          todo={detailsTodo}
          today={today}
          onClose={() => setOpenId(null)}
          onSave={(changes) => onUpdateTodo(detailsTodo.id, changes)}
          onToggle={() => onToggleTodo(detailsTodo)}
          onDelete={() => onDeleteTodo(detailsTodo.id)}
        />
      ) : null}
    </Sheet>
  );
}
