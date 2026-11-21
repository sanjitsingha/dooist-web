import type { Metadata } from "next";
import Image from "next/image";

import { PageHeader } from "@/components/app/PageHeader";
import pkg from "@/package.json";
import logo from "@/public/dooist-icon.png";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 md:px-8">
      <PageHeader title="About" />
      <div className="flex flex-col items-center gap-1 px-6 py-16 text-center">
        <Image src={logo} alt="" width={64} height={64} className="mb-3 size-16 rounded-2xl" />
        <h2 className="text-xl font-semibold text-text">Dooist</h2>
        <p className="text-[15px] text-muted">Your todos, on the web and on your phone.</p>
        <p className="mt-2 text-[13px] text-subtle">Version {pkg.version}</p>
      </div>
    </div>
  );
}
