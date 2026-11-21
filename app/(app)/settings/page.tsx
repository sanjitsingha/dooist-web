import { Settings } from "lucide-react";
import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      icon={Settings}
      heading="Settings are coming soon"
      text="Your preferences will live here."
    />
  );
}
