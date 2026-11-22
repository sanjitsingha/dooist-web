"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const BUTTON =
  "flex size-8 items-center justify-center rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const ARROW = `${BUTTON} cursor-pointer border border-line bg-surface text-text hover:bg-canvas disabled:cursor-default disabled:text-subtle disabled:hover:bg-surface`;

/** The first page, the last, and those beside the current one, with a gap for any skipped. */
function pageItems(page: number, pageCount: number) {
  const wanted = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((number) => number >= 1 && number <= pageCount)
    .sort((a, b) => a - b);

  const items: (number | "gap")[] = [];
  wanted.forEach((number, index) => {
    const skipped = index === 0 ? 0 : number - wanted[index - 1] - 1;
    // A gap hiding a single page takes the same room as that page, so show the page.
    if (skipped === 1) items.push(number - 1);
    else if (skipped > 1) items.push("gap");
    items.push(number);
  });
  return items;
}

/** Which rows are showing, and buttons to move between pages. Hidden when one page holds it all. */
export function Pagination({
  page,
  pageSize,
  total,
  label = "Activity pages",
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** What the pages are of, for screen readers. */
  label?: string;
  onChange: (page: number) => void;
}) {
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={label}
      className="flex flex-col items-center justify-between gap-2 pb-4 sm:flex-row"
    >
      <p className="text-[13px] text-muted">
        {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className={ARROW}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>

        <span className="px-2 text-[13px] text-muted sm:hidden">
          Page {page} of {pageCount}
        </span>
        <ul className="hidden items-center gap-1 sm:flex">
          {pageItems(page, pageCount).map((item, index) =>
            item === "gap" ? (
              <li key={`gap-${index}`} aria-hidden="true" className="w-6 text-center text-muted">
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  onClick={() => onChange(item)}
                  className={`${BUTTON} min-w-8 w-auto cursor-pointer px-1 ${
                    item === page ? "bg-primary text-white" : "text-text hover:bg-field"
                  }`}
                >
                  {item.toLocaleString()}
                </button>
              </li>
            ),
          )}
        </ul>

        <button
          type="button"
          aria-label="Next page"
          disabled={page === pageCount}
          onClick={() => onChange(page + 1)}
          className={ARROW}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </nav>
  );
}
