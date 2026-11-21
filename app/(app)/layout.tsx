import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/app/AppShell";
import { AppShellSkeleton } from "@/components/app/AppShellSkeleton";
import { getCurrentUser } from "@/lib/session";
import pkg from "@/package.json";

/** Every signed-in page shares this frame, so the side nav stays put between them. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <SignedInShell>{children}</SignedInShell>
    </Suspense>
  );
}

async function SignedInShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  // Keyed by account, so one person's todos can never carry over to the next.
  return (
    <AppShell key={user.id} user={user} version={pkg.version}>
      {children}
    </AppShell>
  );
}
