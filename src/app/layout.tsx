import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Roughio | How close can you get?",
  description: "An unlimited Fermi estimation game. Estimate things you don't know, discover the actual answer, and improve your estimation skills.",
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
      </body>
    </html>
  );
}
