"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import cookies from "js-cookie";
import { Space_Grotesk, Inter } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });
const inter = Inter({ subsets: ["latin"], weight: ["500", "600"] });

const NAV_LINKS = [
  { label: "Dashboard", href: "/" },
  { label: "My Trips",  href: "/trips" },
  { label: "Explore",   href: "/explore" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const router   = useRouter();

  /* Map pathname → active tab label */
  const activeTab =
    pathname === "/" ? "Dashboard"
    : pathname.startsWith("/trips")   ? "My Trips"
    : pathname.startsWith("/explore") ? "Explore"
    : "";

  function handleLogout() {
    cookies.remove("token");
    router.push("/auth");
  }

  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F5] border-b border-[#E7E0D4]">
      <div className="max-w-[1120px] mx-auto px-12 h-[60px] flex items-center justify-between">

        {/* ── Logo ───────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2.5 outline-none
          focus-visible:shadow-[0_0_0_3px_#F1E7EE] rounded">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="7"  cy="14" r="5" fill="#714B67" />
            <line x1="12" y1="14" x2="16" y2="14" stroke="#E0663D"
              strokeWidth="2" strokeDasharray="2 2" />
            <circle cx="21" cy="14" r="5" stroke="#9A93A6"
              strokeWidth="2" fill="none" />
          </svg>
          <span className={`text-[20px] font-bold tracking-tight text-[#241B2F] ${spaceGrotesk.className}`}>
            Globe<span className="text-[#714B67]">Trotter</span>
          </span>
        </Link>

        {/* ── Nav tabs ───────────────────────────── */}
        <nav className={`flex gap-8 items-center ${inter.className}`} aria-label="Main navigation">
          {NAV_LINKS.map(({ label, href }) => {
            const active = activeTab === label;
            return (
              <Link
                key={label}
                href={href}
                className={[
                  "text-[15px] pb-1 border-b-2 transition-all duration-150 outline-none",
                  "focus-visible:shadow-[0_0_0_3px_#F1E7EE] rounded-sm",
                  active
                    ? "text-[#714B67] font-semibold border-[#714B67]"
                    : "text-[#5C5468] font-medium border-transparent hover:text-[#241B2F]",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right controls ─────────────────────── */}
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            id="nav-profile-link"
            className="w-9 h-9 rounded-full bg-[#F1E7EE] border-2 border-[#E7E0D4]
              flex items-center justify-center text-[14px] font-semibold text-[#714B67]
              hover:border-[#714B67] hover:shadow-[0_0_0_3px_#F1E7EE]
              transition-all duration-150 outline-none
              focus-visible:shadow-[0_0_0_3px_#F1E7EE]"
            aria-label="Profile"
          >
            <span className={spaceGrotesk.className}>P</span>
          </Link>
          <button
            id="nav-logout-btn"
            onClick={handleLogout}
            className={`text-[13px] font-medium text-[#5C5468] px-3 py-1.5
              rounded-lg border border-[#E7E0D4] hover:border-[#D6CCBC]
              hover:text-[#241B2F] transition-colors duration-150 cursor-pointer
              outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE] ${inter.className}`}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
