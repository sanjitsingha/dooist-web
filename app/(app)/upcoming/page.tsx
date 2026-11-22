import type { Metadata } from "next";

import { UpcomingScreen } from "@/components/upcoming/UpcomingScreen";

export const metadata: Metadata = { title: "Upcoming" };

export default function UpcomingPage() {
  return <UpcomingScreen />;
}
