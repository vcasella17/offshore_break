import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Offshore Break",
  description: "Baseball stats, told as stories.",
};

function NavBar() {
  return (
    <nav className="border-b px-8 py-4 flex items-center gap-6">
      <Link href="/" className="font-bold text-lg mr-4">
        Offshore Break
      </Link>
      <Link href="/players" className="text-gray-600 hover:text-black font-medium">
        Players
      </Link>
      <Link href="/teams" className="text-gray-600 hover:text-black font-medium">
        Teams
      </Link>
      <Link href="/games" className="text-gray-600 hover:text-black font-medium">
        Games
      </Link>
    </nav>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar />
        {children}
      </body>
    </html>
  );
}