import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Roughio — Cognitive Arcade | Test Your Gut, Memory & Scale",
  description: "A competitive retro-modern cognitive arcade featuring numerical estimation, pitch matching, color recall, pattern reproduction, and scale intuition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-text-primary antialiased min-h-screen flex flex-col`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
