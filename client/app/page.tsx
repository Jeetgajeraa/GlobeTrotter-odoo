"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppNav } from "@/src/components/AppNav";
import { getCities, getUserTrips } from "@/src/libs/interaction/dataGetter";
import { City, Trip } from "@/src/libs/types";

type RegionCardData = {
  id: string;
  name: string;
  country: string;
  img: string;
  cost: "low" | "mid" | "high";
  badge: string;
};

/* ── Helpers ──────────────────────────────────────────────── */
const costColor: Record<string, string> = {
  low:  "var(--color-horizon)",
  mid:  "var(--color-sun)",
  high: "var(--color-danger)",
};

function getCostMeta(costIndex: number) {
  if (costIndex <= 2) return { cost: "low" as const, badge: "€€" };
  if (costIndex >= 3.5) return { cost: "high" as const, badge: "€€€€" };
  return { cost: "mid" as const, badge: "€€€" };
}

function formatTripDates(startDate: string, endDate: string) {
  const start = new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const end = new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${start} - ${end}`;
}

function getTripCover(trip: Trip) {
  return trip.coverPhoto || trip.stops?.[0]?.city?.imageUrl || "/banner.png";
}

function extractCities(resData: unknown): City[] {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData as City[];
  if (typeof resData === "object" && Array.isArray((resData as { cities?: City[] }).cities)) {
    return (resData as { cities: City[] }).cities;
  }
  return [];
}

export default function LandingPage() {
  const [search, setSearch] = useState("");
  const [groupOpen,  setGroupOpen]  = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen,   setSortOpen]   = useState(false);
  const [activeGroup,  setActiveGroup]  = useState("Region");
  const [activeSort,   setActiveSort]   = useState("Popular");
  const [activeFilter, setActiveFilter] = useState<string[]>([]);

  const { data: citiesRes } = useQuery({
    queryKey: ["landingCities", search],
    queryFn: () => getCities(search.trim() || undefined),
  });

  const { data: groupedTripsRes } = useQuery({
    queryKey: ["landingTrips", "grouped"],
    queryFn: () => getUserTrips({ groupByStatus: true }),
    retry: false,
  });

  const topRegions = useMemo<RegionCardData[]>(() => {
    const cities = citiesRes?.success ? extractCities(citiesRes.data) : [];
    const cityList = [...cities].slice(0, 10).map((city) => {
      const { cost, badge } = getCostMeta(city.costIndex);
      return {
        id: city.id,
        name: city.name,
        country: city.country,
        img: city.imageUrl || "/banner.png",
        cost,
        badge,
      };
    });

    if (activeSort === "A-Z") {
      cityList.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (activeSort.toLowerCase().includes("low") && activeSort.toLowerCase().includes("high") && activeSort.toLowerCase().indexOf("low") < activeSort.toLowerCase().indexOf("high")) {
      cityList.sort((a, b) => (a.cost === b.cost ? 0 : a.cost === "low" ? -1 : a.cost === "mid" && b.cost === "high" ? -1 : 1));
    }
    if (activeSort.toLowerCase().includes("high") && activeSort.toLowerCase().includes("low") && activeSort.toLowerCase().indexOf("high") < activeSort.toLowerCase().indexOf("low")) {
      cityList.sort((a, b) => (a.cost === b.cost ? 0 : a.cost === "high" ? -1 : a.cost === "mid" && b.cost === "low" ? -1 : 1));
    }

    return cityList.slice(0, 5);
  }, [citiesRes, activeSort]);

  const previousTrips = useMemo(() => {
    return groupedTripsRes?.data?.completed ?? [];
  }, [groupedTripsRes]);

  const toggleFilter = (f: string) =>
    setActiveFilter(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );

  /* close other dropdowns when one opens */
  const openGroup  = () => { setGroupOpen(p => !p); setFilterOpen(false); setSortOpen(false); };
  const openFilter = () => { setFilterOpen(p => !p); setGroupOpen(false); setSortOpen(false); };
  const openSort   = () => { setSortOpen(p => !p);  setGroupOpen(false); setFilterOpen(false); };

  return (
    <div style={{ background: "var(--color-paper)", minHeight: "100vh" }}>

      <AppNav />

      {/* ── Main content ─────────────────────────────────────── */}
      <main style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "32px 48px 96px",
        animation: "fadeRise 200ms ease-out",
      }}>

        {/* ── Banner ───────────────────────────────────────── */}
        <section
          id="banner"
          style={{
            position: "relative",
            width: "100%",
            height: 320,
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            marginBottom: 24,
            boxShadow: "var(--shadow-raised)",
          }}
        >
          <Image
            src="/banner.png"
            alt="Explore beautiful destinations around the world"
            fill
            sizes="(max-width: 1120px) 100vw, 1120px"
            style={{ objectFit: "cover" }}
            priority
          />
          {/* Gradient overlay */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to right, rgba(36,27,47,0.72) 0%, rgba(36,27,47,0.10) 60%, rgba(36,27,47,0.0) 100%)",
          }} />
          {/* Hero copy */}
          <div style={{
            position: "absolute",
            left: 40,
            bottom: 40,
            maxWidth: 480,
          }}>
            <p style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "rgba(255,255,255,0.70)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}>
              Your next adventure awaits
            </p>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 40,
              lineHeight: "46px",
              color: "#FFFFFF",
              marginBottom: 16,
            }}>
              Turn your route<br />into a story
            </h1>
            <p style={{
              fontFamily: "var(--font-body)",
              fontWeight: 400,
              fontSize: 17,
              lineHeight: "26px",
              color: "rgba(255,255,255,0.82)",
            }}>
              Multi-city itineraries, budgets, and shareable plans — all in one place.
            </p>
          </div>
        </section>

        {/* ── Search + Controls row ────────────────────────── */}
        <div style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 32,
        }}>
          {/* Search bar */}
          <div style={{
            flex: 1,
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}>
            <svg
              style={{ position: "absolute", left: 14, pointerEvents: "none" }}
              width="16" height="16" viewBox="0 0 16 16" fill="none"
            >
              <circle cx="7" cy="7" r="5" stroke="var(--color-ink-faint)" strokeWidth="1.5"/>
              <line x1="11" y1="11" x2="14" y2="14" stroke="var(--color-ink-faint)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              id="destination-search"
              type="text"
              placeholder="Search destinations, cities, regions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 44,
                background: "var(--color-surface-sunk)",
                border: "1px solid transparent",
                borderRadius: "var(--radius-sm)",
                padding: "0 16px 0 40px",
                fontFamily: "var(--font-body)",
                fontSize: 15,
                color: "var(--color-ink)",
                outline: "none",
                transition: "border-color 150ms",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--color-mulberry)"; }}
              onBlur={e =>  { e.currentTarget.style.borderColor = "transparent"; }}
            />
          </div>

          {/* Group by */}
          <div style={{ position: "relative" }}>
            <button
              id="group-by-btn"
              onClick={openGroup}
              style={{
                height: 44,
                padding: "0 16px",
                background: groupOpen ? "var(--color-mulberry-tint)" : "var(--color-surface)",
                border: `1px solid ${groupOpen ? "var(--color-mulberry)" : "var(--color-line)"}`,
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: 14,
                color: groupOpen ? "var(--color-mulberry)" : "var(--color-ink-soft)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 150ms",
                whiteSpace: "nowrap",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                <rect x="1" y="9" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                <rect x="9" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                <rect x="9" y="9" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
              Group by: {activeGroup}
            </button>
            {groupOpen && (
              <Dropdown>
                {["Region", "Budget", "Season", "Duration"].map(opt => (
                  <DropdownItem
                    key={opt}
                    label={opt}
                    active={activeGroup === opt}
                    onClick={() => { setActiveGroup(opt); setGroupOpen(false); }}
                  />
                ))}
              </Dropdown>
            )}
          </div>

          {/* Filter */}
          <div style={{ position: "relative" }}>
            <button
              id="filter-btn"
              onClick={openFilter}
              style={{
                height: 44,
                padding: "0 16px",
                background: filterOpen || activeFilter.length > 0 ? "var(--color-mulberry-tint)" : "var(--color-surface)",
                border: `1px solid ${filterOpen || activeFilter.length > 0 ? "var(--color-mulberry)" : "var(--color-line)"}`,
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: 14,
                color: filterOpen || activeFilter.length > 0 ? "var(--color-mulberry)" : "var(--color-ink-soft)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 150ms",
                whiteSpace: "nowrap",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Filter
              {activeFilter.length > 0 && (
                <span style={{
                  background: "var(--color-mulberry)",
                  color: "#fff",
                  borderRadius: "99px",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 500,
                  width: 18, height: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{activeFilter.length}</span>
              )}
            </button>
            {filterOpen && (
              <Dropdown>
                {["Beach", "Mountain", "City", "Cultural", "Adventure", "Budget-friendly"].map(opt => (
                  <DropdownItem
                    key={opt}
                    label={opt}
                    active={activeFilter.includes(opt)}
                    onClick={() => toggleFilter(opt)}
                    multi
                  />
                ))}
              </Dropdown>
            )}
          </div>

          {/* Sort by */}
          <div style={{ position: "relative" }}>
            <button
              id="sort-by-btn"
              onClick={openSort}
              style={{
                height: 44,
                padding: "0 16px",
                background: sortOpen ? "var(--color-mulberry-tint)" : "var(--color-surface)",
                border: `1px solid ${sortOpen ? "var(--color-mulberry)" : "var(--color-line)"}`,
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: 14,
                color: sortOpen ? "var(--color-mulberry)" : "var(--color-ink-soft)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 150ms",
                whiteSpace: "nowrap",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 4l3-3 3 3M4 1v12M10 10l3 3-3 3M13 13V1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sort by: {activeSort}
            </button>
            {sortOpen && (
              <Dropdown>
                {["Popular", "Price: Low–High", "Price: High–Low", "A–Z", "Rating"].map(opt => (
                  <DropdownItem
                    key={opt}
                    label={opt}
                    active={activeSort === opt}
                    onClick={() => { setActiveSort(opt); setSortOpen(false); }}
                  />
                ))}
              </Dropdown>
            )}
          </div>
        </div>

        {/* ── Top Regional Selections ───────────────────────── */}
        <section id="top-regional" style={{ marginBottom: 40 }}>
          <SectionHeader title="Top Regional Selections" />
          {topRegions.length === 0 ? (
            <div style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              color: "var(--color-ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
            }}>
              No destination data found in the database.
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 16,
            }}>
              {topRegions.map(r => (
                <RegionCard key={r.id} region={r} />
              ))}
            </div>
          )}
        </section>

        {/* ── Previous Trips ────────────────────────────────── */}
        <section id="previous-trips" style={{ marginBottom: 48 }}>
          <SectionHeader title="Previous Trips" />
          {previousTrips.length === 0 ? (
            <div style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              color: "var(--color-ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
            }}>
              No completed trips found in the database.
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}>
              {previousTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </section>

      </main>

      {/* ── Floating CTA ─────────────────────────────────────── */}
      <div style={{
        position: "fixed",
        bottom: 32,
        right: 48,
        zIndex: 40,
      }}>
        <Link href="/trips/new" style={{ textDecoration: "none" }}>
          <button
            id="plan-trip-btn"
            style={{
              height: 52,
              padding: "0 28px",
              background: "var(--color-mulberry)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(113,75,103,0.35)",
              transition: "background 150ms, transform 150ms, box-shadow 150ms",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--color-mulberry-dark)";
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(113,75,103,0.45)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "var(--color-mulberry)";
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(113,75,103,0.35)";
            }}
            onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={e =>   { e.currentTarget.style.transform = "scale(1.02)"; }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <line x1="9" y1="2" x2="9" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="2" y1="9" x2="16" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Plan a trip
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────────────────────── */

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      marginBottom: 20,
    }}>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: 22,
        color: "var(--color-ink)",
        whiteSpace: "nowrap",
      }}>{title}</h2>
      <div style={{
        flex: 1,
        height: 1,
        background: "var(--color-line)",
      }} />
    </div>
  );
}

function RegionCard({ region }: { region: RegionCardData }) {
  const [hovered, setHovered] = useState(false);
  const color = costColor[region.cost] ?? "var(--color-ink-faint)";
  return (
    <article
      id={`region-card-${region.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        boxShadow: hovered ? "var(--shadow-raised)" : "var(--shadow-card)",
        border: "1px solid var(--color-line)",
        cursor: "pointer",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "box-shadow 150ms, transform 150ms",
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", height: 120, overflow: "hidden" }}>
        <Image
          src={region.img}
          alt={`${region.name}, ${region.country}`}
          fill
          sizes="(max-width: 1120px) 22vw, 220px"
          style={{
            objectFit: "cover",
            filter: hovered ? "brightness(0.90)" : "brightness(1)",
            transition: "filter 150ms",
          }}
        />
        {/* Cost badge */}
        <span style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: color,
          color: "#fff",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 500,
          padding: "2px 8px",
          borderRadius: "99px",
        }}>{region.badge}</span>
      </div>
      {/* Info */}
      <div style={{ padding: "12px 14px" }}>
        <p style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 15,
          color: "var(--color-ink)",
          marginBottom: 2,
        }}>{region.name}</p>
        <p style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "var(--color-ink-soft)",
        }}>{region.country}</p>
      </div>
    </article>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const [hovered, setHovered] = useState(false);
  const tripStatus = trip.status === "completed" ? "Completed" : trip.status === "ongoing" ? "Ongoing" : "Upcoming";
  const stopsCount = trip.stops?.length ?? 0;
  const budget = trip.totalExpense > 0 ? `$${trip.totalExpense}` : "--";
  return (
    <article
      id={`trip-card-${trip.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        boxShadow: hovered ? "var(--shadow-raised)" : "var(--shadow-card)",
        border: "1px solid var(--color-line)",
        cursor: "pointer",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "box-shadow 150ms, transform 150ms",
        position: "relative",
      }}
    >
      {/* Cover image */}
      <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
        <Image
          src={getTripCover(trip)}
          alt={trip.name}
          fill
          sizes="(max-width: 1120px) 35vw, 350px"
          style={{
            objectFit: "cover",
            filter: hovered ? "brightness(0.88)" : "brightness(1)",
            transition: "filter 150ms",
          }}
        />
        {/* Gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(36,27,47,0.62) 0%, transparent 50%)",
        }} />
        {/* Status badge */}
        <span style={{
          position: "absolute",
          top: 12,
          left: 14,
          background: "rgba(47,122,111,0.15)",
          border: "1px solid var(--color-horizon)",
          color: "var(--color-horizon)",
          fontFamily: "var(--font-body)",
          fontWeight: 500,
          fontSize: 12,
          padding: "3px 10px",
          borderRadius: "99px",
          backdropFilter: "blur(4px)",
        }}>{tripStatus}</span>
        {/* Trip name on image */}
        <div style={{ position: "absolute", bottom: 14, left: 14, right: 14 }}>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 18,
            color: "#ffffff",
            lineHeight: "24px",
          }}>{trip.name}</h3>
        </div>
      </div>

      {/* Body — ticket stub style */}
      <div style={{ padding: "16px 20px", display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
        {/* Left: dates + stops */}
        <div>
          <p style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--color-ink-soft)",
            marginBottom: 4,
          }}>{formatTripDates(trip.startDate, trip.endDate)}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* mini route dots */}
            <span style={{
              display: "flex", alignItems: "center", gap: 4,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--color-ink-soft)",
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10">
                <circle cx="5" cy="5" r="4" fill="var(--color-mulberry)"/>
              </svg>
              {stopsCount} stops
            </span>
          </div>
        </div>

        {/* Perforated divider */}
        <div style={{
          width: 1,
          alignSelf: "stretch",
          borderLeft: "2px dashed var(--color-line)",
          position: "relative",
        }}>
          <span style={{
            position: "absolute",
            top: -8, left: "50%",
            transform: "translateX(-50%)",
            width: 14, height: 14,
            borderRadius: "50%",
            background: "var(--color-paper)",
            border: "1px solid var(--color-line)",
            display: "block",
          }}/>
          <span style={{
            position: "absolute",
            bottom: -8, left: "50%",
            transform: "translateX(-50%)",
            width: 14, height: 14,
            borderRadius: "50%",
            background: "var(--color-paper)",
            border: "1px solid var(--color-line)",
            display: "block",
          }}/>
        </div>

        {/* Right: budget */}
        <div style={{ textAlign: "right" }}>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: 12,
            color: "var(--color-ink-faint)",
            marginBottom: 2,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>Total budget</p>
          <p style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
            fontSize: 18,
            color: "var(--color-ink)",
          }}>{budget}</p>
        </div>
      </div>

      {/* Hover action row */}
      <div style={{
        display: "flex",
        gap: 8,
        padding: "0 20px 16px",
        opacity: hovered ? 1 : 0,
        transform: hovered ? "translateY(0)" : "translateY(4px)",
        transition: "opacity 150ms, transform 150ms",
      }}>
        {["View", "Edit", "Share"].map(action => (
          <button
            key={action}
            id={`trip-${action.toLowerCase()}-${trip.id}`}
            style={{
              flex: 1,
              height: 34,
              background: action === "View" ? "var(--color-mulberry)" : "var(--color-surface-sunk)",
              color: action === "View" ? "#fff" : "var(--color-ink-soft)",
              border: `1px solid ${action === "View" ? "transparent" : "var(--color-line)"}`,
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "background 150ms",
            }}
          >
            {action}
          </button>
        ))}
      </div>
    </article>
  );
}

function Dropdown({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "absolute",
      top: "calc(100% + 6px)",
      right: 0,
      background: "var(--color-surface)",
      border: "1px solid var(--color-line)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-raised)",
      minWidth: 180,
      zIndex: 100,
      overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

function DropdownItem({
  label,
  active,
  onClick,
  multi,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  multi?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 16px",
        background: active ? "var(--color-mulberry-tint)" : "transparent",
        color: active ? "var(--color-mulberry)" : "var(--color-ink-soft)",
        fontFamily: "var(--font-body)",
        fontWeight: active ? 600 : 400,
        fontSize: 14,
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 100ms",
      }}
    >
      {multi && (
        <span style={{
          width: 16, height: 16,
          border: `2px solid ${active ? "var(--color-mulberry)" : "var(--color-line-strong)"}`,
          borderRadius: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: active ? "var(--color-mulberry)" : "transparent",
          flexShrink: 0,
        }}>
          {active && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </span>
      )}
      {!multi && active && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--color-mulberry)", flexShrink: 0,
        }}/>
      )}
      {!multi && !active && (
        <span style={{ width: 6, height: 6, flexShrink: 0 }}/>
      )}
      {label}
    </button>
  );
}
