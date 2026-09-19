import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offshore Break",
  description: "Baseball stats, told as stories.",
};

function NavBar() {
  return (
    <header className="border-b border-[#1A2842]/20 bg-[#F8F3EA]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="group">
          <div className="text-xl font-black tracking-[-0.04em] text-[#1A2842]">
            OFFSHORE <span className="text-[#D85F46]">BREAK</span>
          </div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#59B3AD]">
            Baseball Analytics
          </div>
        </Link>

        <div className="flex items-center gap-8 text-sm font-semibold text-[#1A2842]">
          <Link
            href="/players"
            className="transition-colors hover:text-[#D85F46]"
          >
            Players
          </Link>

          <Link
            href="/teams"
            className="transition-colors hover:text-[#D85F46]"
          >
            Teams
          </Link>

          <Link
            href="/games"
            className="transition-colors hover:text-[#D85F46]"
          >
            Games
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}