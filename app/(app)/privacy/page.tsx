import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const metadata: Metadata = { title: "Privacy Policy" };

/** Waiting for the real policy text, which has to come from the app's owner. */
export default function PrivacyPage() {
  return (
    <PlaceholderPage
      title="Privacy Policy"
      icon={ShieldCheck}
      heading="Privacy policy coming soon"
      text="It will be published on this page."
    />
  );
}
