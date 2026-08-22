"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import cookies from "js-cookie";
import { Space_Grotesk, Inter } from "next/font/google";
import { getMe } from "@/src/libs/interaction/dataGetter";
import { User } from "@/src/libs/types";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });
const inter = Inter({ subsets: ["latin"], weight: ["500", "600"] });

const NAV_LINKS = [
  { label: "Dashboard", href: "/" },
  { label: "My Trips", href: "/trips" },
  { label: "Explore", href: "/explore" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = cookies.get("token");
    if (token) {
      setIsAuthenticated(true);
      getMe()
        .then((res) => {
          if (res?.success && res.data?.user) {
            setUser(res.data.user);
          }
        })
        .catch(() => {});
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [pathname]);

  /* Map pathname → active tab label */
  const activeTab =
    pathname === "/"
      ? "Dashboard"
      : pathname.startsWith("/trips")
      ? "My Trips"
      : pathname.startsWith("/explore")
      ? "Explore"
      : "";

  function handleLogout() {
    cookies.remove("token");
    setIsAuthenticated(false);
    setUser(null);
    router.push("/auth");
  }

  const userInitial = user?.firstName?.[0]?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F5] border-b border-[#E7E0D4]">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-12 h-[60px] flex items-center justify-between">
        {/* ── Logo ───────────────────────────────── */}
        <Link
          href="/"
          className="flex items-center gap-2.5 outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE] rounded"
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="7" cy="14" r="5" fill="#714B67" />
            <line
              x1="12"
              y1="14"
              x2="16"
              y2="14"
              stroke="#E0663D"
              strokeWidth="2"
              strokeDasharray="2 2"
            />
            <circle
              cx="21"
              cy="14"
              r="5"
              stroke="#9A93A6"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          <span
            className={`text-[20px] font-bold tracking-tight text-[#241B2F] ${spaceGrotesk.className}`}
          >
            Globe<span className="text-[#714B67]">Trotter</span>
          </span>
        </Link>

        {/* ── Nav tabs ───────────────────────────── */}
        <nav
          className={`flex gap-6 sm:gap-8 items-center ${inter.className}`}
          aria-label="Main navigation"
        >
          {NAV_LINKS.map(({ label, href }) => {
            const active = activeTab === label;
            return (
              <Link
                key={label}
                href={href}
                className={[
                  "text-[14px] sm:text-[15px] pb-1 border-b-2 transition-all duration-150 outline-none",
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

        {/* ── Right controls: Auth Conditional ─────────────────────── */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href="/profile"
                id="nav-profile-link"
                className="w-9 h-9 rounded-full bg-[#F1E7EE] border-2 border-[#E7E0D4] overflow-hidden
                  flex items-center justify-center text-[14px] font-semibold text-[#714B67]
                  hover:border-[#714B67] hover:shadow-[0_0_0_3px_#F1E7EE]
                  transition-all duration-150 outline-none
                  focus-visible:shadow-[0_0_0_3px_#F1E7EE]"
                aria-label="Profile"
              >
                {user?.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className={spaceGrotesk.className}>{userInitial}</span>
                )}
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
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth"
                className={`text-[13.5px] font-medium text-[#5C5468] px-3 py-1.5
                  rounded-lg hover:text-[#241B2F] transition-colors ${inter.className}`}
              >
                Log in
              </Link>
              <Link
                href="/auth?mode=signup"
                className={`text-[13.5px] font-semibold text-white bg-[#714B67] hover:bg-[#4E3347]
                  px-3.5 py-1.5 rounded-lg shadow-xs transition-all ${inter.className}`}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
