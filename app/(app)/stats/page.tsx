import { ChartPie } from "lucide-react";
import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const metadata: Metadata = { title: "Stats" };

/** A placeholder until the Android app's Stats tab is built for the web. */
export default function StatsPage() {
  return (
    <PlaceholderPage
      title="Stats"
      icon={ChartPie}
      heading="Stats are coming soon"
      text="Your progress will show up here."
    />
  );
}
