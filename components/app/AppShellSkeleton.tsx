import { TodoListSkeleton } from "@/components/home/TodoListSkeleton";

/** The first paint of a signed-in page, the same shape as the real frame so nothing jumps. */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside
        aria-hidden="true"
        className="sticky top-0 hidden h-dvh w-[320px] shrink-0 animate-pulse flex-col border-r border-line bg-surface p-4 md:flex lg:w-[380px] rail:w-[72px] lg:rail:w-[72px] rail:px-3"
      >
        <div className="mb-5 flex h-10 items-center gap-2 px-2 rail:justify-center rail:px-0">
          <div className="size-7 shrink-0 rounded-full bg-field" />
          <div className="h-3 flex-1 rounded-sm bg-field rail:hidden" />
        </div>
        <div className="h-10 rounded-xl bg-field" />
        <div className="mt-5 h-10 rounded-xl bg-field" />
        <div className="mt-1 h-10 rounded-xl bg-field" />
        <div className="mt-1 h-10 rounded-xl bg-field" />
        <div className="mt-1 h-10 rounded-xl bg-field" />
        <div className="mx-3 mt-auto h-4 w-48 shrink-0 rounded-sm bg-field rail:hidden" />
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[720px] px-4 pt-9 md:px-8">
          <p className="sr-only">Loading…</p>
          <div aria-hidden="true" className="mb-8 h-9 w-48 animate-pulse rounded-lg bg-field" />
          <div aria-hidden="true" className="mb-4 h-14 animate-pulse rounded-xl bg-field" />
          <TodoListSkeleton />
        </div>
      </main>
    </div>
  );
}
