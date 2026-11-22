import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SIDEBAR_SCRIPT } from "@/lib/sidebar";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Dooist",
    template: "%s · Dooist",
  },
  description: "Your todos, on the web and on your phone.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
