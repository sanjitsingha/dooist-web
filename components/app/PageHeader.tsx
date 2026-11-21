/** A page's big title, the same size and place as the month on Today. */
export function PageHeader({ title }: { title: string }) {
  return (
    <header className="flex min-h-11 items-center pt-9 pb-4">
      <h1 className="truncate text-[28px] leading-9 font-semibold tracking-[-0.8px] text-text">
        {title}
      </h1>
    </header>
  );
}
