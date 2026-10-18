import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Apex Insights — Survey Made Easy",
    template: "%s · Apex Insights",
  },
  description:
    "Create surveys, collect responses, and preview analytics with built-in synthetic demo data. Built for students, school projects, research and surveys.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
