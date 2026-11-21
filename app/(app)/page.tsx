import type { Metadata } from "next";

import { HomeScreen } from "@/components/home/HomeScreen";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return <HomeScreen />;
}
