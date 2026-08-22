import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GlobeTrotter — Plan your multi-city adventure",
  description:
    "GlobeTrotter is a multi-city trip planner that turns your route into something you can see — with interactive itineraries, budget tracking, and shareable travel plans.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
