import { ScrollText } from "lucide-react";
import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const metadata: Metadata = { title: "Changelog" };

export default function ChangelogPage() {
  return (
    <PlaceholderPage
      title="Changelog"
      icon={ScrollText}
      heading="No updates yet"
      text="New releases will be listed here."
    />
  );
}
