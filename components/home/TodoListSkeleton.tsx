/** Gray placeholder cards while the day's todos load. */
export function TodoListSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-2 pt-3">
      <div className="h-16 rounded-2xl bg-field" />
      <div className="h-16 rounded-2xl bg-field" />
      <div className="h-16 rounded-2xl bg-field" />
    </div>
  );
}
