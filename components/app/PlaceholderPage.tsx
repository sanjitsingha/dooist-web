import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/app/PageHeader";

/** A page whose content doesn't exist yet, and says so. */
export function PlaceholderPage({
  title,
  icon: Icon,
  heading,
  text,
}: {
  title: string;
  icon: LucideIcon;
  heading: string;
  text: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 md:px-8">
      <PageHeader title={title} />
      <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
        <Icon aria-hidden="true" strokeWidth={1.5} className="size-12 text-subtle" />
        <h2 className="mt-2 text-xl font-semibold text-text">{heading}</h2>
        <p className="text-[15px] text-muted">{text}</p>
      </div>
    </div>
  );
}
