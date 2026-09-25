import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offshore Break",
  description: "Baseball stats, told as stories.",
};

const navigation = [
  { href: "/players", label: "Players", number: "01" },
  { href: "/teams", label: "Teams", number: "02" },
  { href: "/games", label: "Games", number: "03" },
  { href: "/leaders", label: "Leaders", number: "04" },
  { href: "/compare", label: "Compare", number: "05" },
];

function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#1A2842]/15 bg-[#F8F3EA]/95 backdrop-blur-md">
      <nav className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 md:px-8">
        {/* BRAND */}
        <Link
          href="/"
          className="group flex items-center gap-3"
        >
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden border border-[#1A2842]/20 bg-[#1A2842]">
            <Image
              src="/logo.png"
              alt="Offshore Break"
              width={32}
              height={32}
              className="relative z-10 object-contain"
            />

            <div
              className="absolute bottom-0 left-0 h-[3px] w-full bg-[#D85F46]"
              aria-hidden
            />
          </div>

          <div className="leading-none">
            <div className="text-[19px] font-black tracking-[-0.055em] text-[#1A2842]">
              OFFSHORE{" "}
              <span className="text-[#D85F46]">BREAK</span>
            </div>

            <div className="mt-1.5 text-[8px] font-black uppercase tracking-[0.25em] text-[#59B3AD]">
              Baseball Analytics
            </div>
          </div>
        </Link>

        {/* CENTER NAV */}
        <div className="hidden items-stretch md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex h-[76px] items-center gap-3 px-5 text-[#1A2842]"
            >
              <span className="font-mono text-[8px] font-bold text-[#9AA1AA] transition-colors group-hover:text-[#D85F46]">
                {item.number}
              </span>

              <span className="text-[11px] font-black uppercase tracking-[0.12em]">
                {item.label}
              </span>

              <span className="absolute bottom-0 left-5 right-5 h-[2px] origin-left scale-x-0 bg-[#D85F46] transition-transform duration-200 group-hover:scale-x-100" />
            </Link>
          ))}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">
          <div className="hidden border-l border-[#1A2842]/15 pl-5 text-right sm:block">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
              Data Desk
            </p>

            <p className="mt-1 flex items-center justify-end gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1A2842]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#59B3AD]" />
              Live
            </p>
          </div>

          <Link
            href="/players"
            className="flex h-9 items-center border border-[#1A2842] bg-[#1A2842] px-4 text-[9px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#D85F46] hover:border-[#D85F46]"
          >
            Explore
          </Link>
        </div>
      </nav>

      {/* MOBILE NAV */}
      <div className="border-t border-[#1A2842]/10 md:hidden">
        <div className="flex overflow-x-auto px-4">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-[#687384] transition hover:text-[#D85F46]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#1A2842]/15 bg-[#101A2C] text-white">
      <div className="mx-auto max-w-[1440px] px-5 py-10 md:px-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <div className="text-lg font-black tracking-[-0.04em]">
              OFFSHORE{" "}
              <span className="text-[#D85F46]">BREAK</span>
            </div>

            <p className="mt-2 max-w-sm text-xs leading-5 text-white/40">
              Baseball stats, told as stories.
            </p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">
              Data Infrastructure
            </p>

            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
              MLB · Statcast · Supabase
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-5">
          <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/25">
            OFFSHORE BREAK / BASEBALL ANALYTICS / {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#F8F3EA] text-[#1A2842] antialiased">
        <NavBar />

        <div className="min-h-screen">
          {children}
        </div>

        <SiteFooter />
      </body>
    </html>
  );
}