import Image from "next/image";

import { SITE } from "@/lib/site";
import logo from "@/public/dooist-icon.png";

/** The frame for public pages, which need no account and sit outside the app. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-page">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-[1040px] items-center gap-2.5 px-5">
          <Image src={logo} alt="" width={32} height={32} className="size-8 rounded-lg" />
          <span className="text-lg font-bold text-text">{SITE.name}</span>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1040px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-6 text-[13px] text-muted">
          <span>
            © 2026 {SITE.name} · {SITE.domain}
          </span>
          <a
            href={`mailto:${SITE.contactEmail}`}
            className="rounded-sm transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {SITE.contactEmail}
          </a>
        </div>
      </footer>
    </div>
  );
}
