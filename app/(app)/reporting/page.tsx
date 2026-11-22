import type { Metadata } from "next";

import { ReportingScreen } from "@/components/reporting/ReportingScreen";

export const metadata: Metadata = { title: "Reporting" };

export default function ReportingPage() {
  return <ReportingScreen />;
}
