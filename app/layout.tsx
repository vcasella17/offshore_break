import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Offshore Break",
    template: "%s | Offshore Break",
  },
  description: "Baseball stats, told as stories.",
};

const navigation = [
  { href: "/players", label: "Players" },
  { href: "/teams", label: "Teams" },
  { href: "/games", label: "Games" },
  { href: "/leaders", label: "Leaders" },
  { href: "/compare", label: "Compare" },
];

function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#1A2842]/15 bg-[#F8F3EA]/95 backdrop-blur-md">
      <nav
        aria-label="Main navigation"
        className="container-page flex h-[5.125rem] items-center justify-between"
      >
        <Link
          href="/"
          aria-label="Offshore Break home"
          className="group flex shrink-0 items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D85F46]"
        >
          <span className="relative block h-[3.25rem] w-[4.375rem] shrink-0 overflow-hidden">
            <Image
              src="/logo.png"
              alt=""
              width={1412}
              height={956}
              priority
              className="absolute left-[-1.27rem] top-[-0.1rem] h-auto w-[7.06rem] max-w-none"
            />
          </span>

          <span className="leading-none">
            <span className="block text-[1.3rem] font-black tracking-[-0.055em] text-[#1A2842] sm:text-[1.45rem]">
              OFFSHORE <span className="text-[#D85F46]">BREAK</span>
            </span>
            <span className="mt-1.5 block text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#687384]">
              Baseball, by the numbers
            </span>
          </span>
        </Link>

        <div className="hidden h-full items-stretch md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex h-full items-center px-4 text-[#1A2842] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#D85F46] lg:px-5"
            >
              <span className="text-base font-semibold transition-colors group-hover:text-[#D85F46]">
                {item.label}
              </span>
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-4 right-4 h-[2px] origin-left scale-x-0 bg-[#D85F46] transition-transform duration-200 group-hover:scale-x-100 lg:left-5 lg:right-5"
              />
            </Link>
          ))}
        </div>

        <Link
          href="/players"
          className="hidden h-11 items-center border border-[#1A2842] px-5 text-sm font-semibold text-[#1A2842] transition hover:border-[#D85F46] hover:bg-[#D85F46] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D85F46] sm:flex"
        >
          Browse players
          <span aria-hidden="true" className="ml-2">
            →
          </span>
        </Link>
      </nav>

      <nav
        aria-label="Mobile navigation"
        className="border-t border-[#1A2842]/10 md:hidden"
      >
        <div className="flex overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 px-4 py-3 text-sm font-medium text-[#687384] transition hover:text-[#D85F46] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#D85F46]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#101A2C] bg-[#1A2842] text-[#F8F3EA]">
      <div className="container-page py-12 md:py-14">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <Link
              href="/"
              className="inline-block rounded-sm text-xl font-black tracking-[-0.04em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#59B3AD]"
            >
              OFFSHORE <span className="text-[#D85F46]">BREAK</span>
            </Link>

            <p className="mt-3 max-w-sm text-base leading-7 text-white/60">
              A closer look at the players, clubs, and numbers behind the game.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-6 gap-y-3"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-white/65 transition hover:text-[#F8F3EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#59B3AD]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-9 flex flex-col justify-between gap-3 border-t border-white/15 pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-white/45">
            Baseball stats, told as stories.
          </p>

          <p className="font-mono text-xs text-white/40">
            © {new Date().getFullYear()} Offshore Break
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
      <body className="flex min-h-screen flex-col bg-[#F8F3EA] text-[#1A2842] antialiased">
        <NavBar />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}