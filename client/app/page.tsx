"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Space_Grotesk, Inter } from "next/font/google";
import { AppNav } from "@/src/components/AppNav";
import { getCities, getUserTrips, getActivities } from "@/src/libs/interaction/dataGetter";
import { City, Trip, Activity } from "@/src/libs/types";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

type SearchTab = "all" | "cities" | "trips" | "activities";

export default function LandingPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");

  // Real Data states
  const [cities, setCities] = useState<City[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activities, setActivities] = useState<(Activity & { city?: { id: string; name: string; country: string } })[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort states
  const [groupOpen, setGroupOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState("All");
  const [activeSort, setActiveSort] = useState("Popular");
  const [activeFilter, setActiveFilter] = useState<string[]>([]);

  // Fetch real cities, user trips, and activities
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [citiesRes, tripsRes, activitiesRes] = await Promise.allSettled([
          getCities(),
          getUserTrips(),
          getActivities(),
        ]);

        if (citiesRes.status === "fulfilled" && citiesRes.value?.success) {
          const raw = citiesRes.value.data as any;
          if (Array.isArray(raw)) {
            setCities(raw);
          } else if (raw?.cities && Array.isArray(raw.cities)) {
            setCities(raw.cities);
          }
        }

        if (tripsRes.status === "fulfilled" && tripsRes.value?.success) {
          const raw = tripsRes.value.data;
          if (Array.isArray(raw)) {
            setTrips(raw);
          }
        }

        if (activitiesRes.status === "fulfilled" && activitiesRes.value?.success) {
          const raw = activitiesRes.value.data as any;
          if (Array.isArray(raw)) {
            setActivities(raw);
          } else if (raw?.activities && Array.isArray(raw.activities)) {
            setActivities(raw.activities);
          }
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const toggleFilter = (f: string) =>
    setActiveFilter(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );

  const openGroup = () => { setGroupOpen(p => !p); setFilterOpen(false); setSortOpen(false); };
  const openFilter = () => { setFilterOpen(p => !p); setGroupOpen(false); setSortOpen(false); };
  const openSort = () => { setSortOpen(p => !p); setGroupOpen(false); setFilterOpen(false); };

  // Search matches computed dynamically
  const isSearching = search.trim().length > 0;
  const searchQuery = search.toLowerCase().trim();

  const searchResults = useMemo(() => {
    if (!isSearching) {
      return { matchedCities: [], matchedTrips: [], matchedActivities: [], totalCount: 0 };
    }

    const matchedCities = cities.filter(c =>
      c.name.toLowerCase().includes(searchQuery) ||
      c.country.toLowerCase().includes(searchQuery) ||
      (c.region && c.region.toLowerCase().includes(searchQuery))
    );

    const matchedTrips = trips.filter(t =>
      t.name.toLowerCase().includes(searchQuery) ||
      (t.description && t.description.toLowerCase().includes(searchQuery)) ||
      t.stops?.some(s => s.city?.name.toLowerCase().includes(searchQuery) || s.city?.country.toLowerCase().includes(searchQuery))
    );

    const matchedActivities = activities.filter(a =>
      a.name.toLowerCase().includes(searchQuery) ||
      (a.description && a.description.toLowerCase().includes(searchQuery)) ||
      a.category.toLowerCase().includes(searchQuery) ||
      (a.city && (a.city.name.toLowerCase().includes(searchQuery) || a.city.country.toLowerCase().includes(searchQuery)))
    );

    const totalCount = matchedCities.length + matchedTrips.length + matchedActivities.length;

    return {
      matchedCities,
      matchedTrips,
      matchedActivities,
      totalCount,
    };
  }, [isSearching, searchQuery, cities, trips, activities]);

  // Displayed cities in default view with sorting/filtering
  const displayedCities = useMemo(() => {
    let list = [...cities];

    // Filter by category or budget if active
    if (activeFilter.length > 0) {
      list = list.filter(c => {
        const costTier = getCostTier(c.costIndex);
        return activeFilter.includes(costTier) || (c.region && activeFilter.includes(c.region));
      });
    }

    // Grouping / Region filter
    if (activeGroup !== "All" && activeGroup !== "Region") {
      list = list.filter(c => c.region === activeGroup || c.country === activeGroup);
    }

    // Sorting
    if (activeSort === "A–Z") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (activeSort === "Price: Low–High") {
      list.sort((a, b) => a.costIndex - b.costIndex);
    } else if (activeSort === "Price: High–Low") {
      list.sort((a, b) => b.costIndex - a.costIndex);
    } else {
      // Default: Popular
      list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    return list;
  }, [cities, activeFilter, activeGroup, activeSort]);

  return (
    <div style={{ background: "#FAF8F5", minHeight: "100vh" }}>
      <AppNav />

      {/* ── Main content ─────────────────────────────────────── */}
      <main
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "32px 24px 96px",
        }}
      >
        {/* ── Banner (Only shown when NOT searching) ── */}
        {!isSearching && (
          <section
            id="banner"
            style={{
              position: "relative",
              width: "100%",
              minHeight: 240,
              borderRadius: "16px",
              overflow: "hidden",
              marginBottom: 24,
              boxShadow: "0 4px 12px rgba(36,27,47,0.10)",
              background: "linear-gradient(135deg, #4E3347 0%, #241B2F 100%)",
              padding: "40px 36px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `radial-gradient(circle at 80% 20%, rgba(224, 102, 61, 0.3) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(113, 75, 103, 0.45) 0%, transparent 60%)`,
              }}
            />
            {/* Hero copy */}
            <div
              style={{
                position: "relative",
                zIndex: 10,
                maxWidth: 560,
              }}
            >
              <p
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.75)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Your next journey begins here
              </p>
              <h1
                className={spaceGrotesk.className}
                style={{
                  fontWeight: 700,
                  fontSize: 32,
                  lineHeight: "38px",
                  color: "#FFFFFF",
                  marginBottom: 10,
                }}
              >
                Turn your route into an unforgettable story
              </h1>
              <p
                className={inter.className}
                style={{
                  fontWeight: 400,
                  fontSize: 15,
                  lineHeight: "22px",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Discover real destinations, multi-city itineraries, and activities all in one place.
              </p>
            </div>
          </section>
        )}

        {/* ── Search + Controls row ────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: isSearching ? 24 : 32,
            flexWrap: "wrap",
          }}
        >
          {/* Search bar */}
          <div
            style={{
              flex: 1,
              minWidth: 260,
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg
              style={{ position: "absolute", left: 14, pointerEvents: "none" }}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9A93A6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="destination-search"
              type="text"
              placeholder="Search cities, trips, and activities by name, country, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 46,
                background: "#FFFFFF",
                border: "1px solid #E7E0D4",
                borderRadius: "8px",
                padding: "0 40px 0 44px",
                fontFamily: "inherit",
                fontSize: 15,
                color: "#241B2F",
                outline: "none",
                boxShadow: "0 1px 2px rgba(36,27,47,0.04)",
                transition: "border-color 150ms, box-shadow 150ms",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#714B67";
                e.currentTarget.style.boxShadow = "0 0 0 3px #F1E7EE";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E7E0D4";
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(36,27,47,0.04)";
              }}
            />
            {isSearching && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 12,
                  background: "transparent",
                  border: "none",
                  color: "#9A93A6",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 4,
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Group by (for default view) */}
          {!isSearching && (
            <div style={{ position: "relative" }}>
              <button
                id="group-by-btn"
                onClick={openGroup}
                style={{
                  height: 46,
                  padding: "0 16px",
                  background: groupOpen ? "#F1E7EE" : "#FFFFFF",
                  border: `1px solid ${groupOpen ? "#714B67" : "#E7E0D4"}`,
                  borderRadius: "8px",
                  fontWeight: 500,
                  fontSize: 14,
                  color: groupOpen ? "#714B67" : "#5C5468",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 150ms",
                  whiteSpace: "nowrap",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
                  <rect x="1" y="9" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
                  <rect x="9" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
                  <rect x="9" y="9" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                Group: {activeGroup}
              </button>
              {groupOpen && (
                <Dropdown>
                  {["All", "Europe", "Asia", "Americas", "Africa", "Oceania"].map((opt) => (
                    <DropdownItem
                      key={opt}
                      label={opt}
                      active={activeGroup === opt}
                      onClick={() => {
                        setActiveGroup(opt);
                        setGroupOpen(false);
                      }}
                    />
                  ))}
                </Dropdown>
              )}
            </div>
          )}

          {/* Filter */}
          {!isSearching && (
            <div style={{ position: "relative" }}>
              <button
                id="filter-btn"
                onClick={openFilter}
                style={{
                  height: 46,
                  padding: "0 16px",
                  background: filterOpen || activeFilter.length > 0 ? "#F1E7EE" : "#FFFFFF",
                  border: `1px solid ${filterOpen || activeFilter.length > 0 ? "#714B67" : "#E7E0D4"}`,
                  borderRadius: "8px",
                  fontWeight: 500,
                  fontSize: 14,
                  color: filterOpen || activeFilter.length > 0 ? "#714B67" : "#5C5468",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 150ms",
                  whiteSpace: "nowrap",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Filter
                {activeFilter.length > 0 && (
                  <span
                    style={{
                      background: "#714B67",
                      color: "#fff",
                      borderRadius: "99px",
                      fontSize: 11,
                      fontWeight: 500,
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {activeFilter.length}
                  </span>
                )}
              </button>
              {filterOpen && (
                <Dropdown>
                  {["Budget-Friendly", "Moderate", "Luxury"].map((opt) => (
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
          )}

          {/* Sort by */}
          {!isSearching && (
            <div style={{ position: "relative" }}>
              <button
                id="sort-by-btn"
                onClick={openSort}
                style={{
                  height: 46,
                  padding: "0 16px",
                  background: sortOpen ? "#F1E7EE" : "#FFFFFF",
                  border: `1px solid ${sortOpen ? "#714B67" : "#E7E0D4"}`,
                  borderRadius: "8px",
                  fontWeight: 500,
                  fontSize: 14,
                  color: sortOpen ? "#714B67" : "#5C5468",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 150ms",
                  whiteSpace: "nowrap",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 4l3-3 3 3M4 1v12M10 10l3 3-3 3M13 13V1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Sort: {activeSort}
              </button>
              {sortOpen && (
                <Dropdown>
                  {["Popular", "Price: Low–High", "Price: High–Low", "A–Z"].map((opt) => (
                    <DropdownItem
                      key={opt}
                      label={opt}
                      active={activeSort === opt}
                      onClick={() => {
                        setActiveSort(opt);
                        setSortOpen(false);
                      }}
                    />
                  ))}
                </Dropdown>
              )}
            </div>
          )}
        </div>

        {/* ── SEARCH RESULTS VIEW (Only shown when user is searching) ── */}
        {isSearching ? (
          <section id="search-results-section">
            {/* Search Header and Tabs */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #E7E0D4",
                paddingBottom: 12,
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2 className={spaceGrotesk.className} style={{ fontSize: 20, fontWeight: 700, color: "#241B2F" }}>
                  Search Results for &ldquo;{search}&rdquo;
                </h2>
                <p style={{ fontSize: 13, color: "#5C5468", marginTop: 2 }}>
                  Found {searchResults.totalCount} matching {searchResults.totalCount === 1 ? "result" : "results"}
                </p>
              </div>

              {/* Result Category Tabs */}
              <div style={{ display: "flex", gap: 6, background: "#F1EDE6", padding: 4, borderRadius: "8px" }}>
                {[
                  { id: "all", label: `All (${searchResults.totalCount})` },
                  { id: "cities", label: `Cities (${searchResults.matchedCities.length})` },
                  { id: "trips", label: `Trips (${searchResults.matchedTrips.length})` },
                  { id: "activities", label: `Activities (${searchResults.matchedActivities.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SearchTab)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: activeTab === tab.id ? 600 : 500,
                      background: activeTab === tab.id ? "#FFFFFF" : "transparent",
                      color: activeTab === tab.id ? "#714B67" : "#5C5468",
                      border: "none",
                      boxShadow: activeTab === tab.id ? "0 1px 3px rgba(36,27,47,0.08)" : "none",
                      cursor: "pointer",
                      transition: "all 150ms",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zero Results Empty State */}
            {searchResults.totalCount === 0 ? (
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "14px",
                  border: "1px solid #E7E0D4",
                  padding: "48px 24px",
                  textAlign: "center",
                  maxWidth: 480,
                  margin: "32px auto",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <h3 className={spaceGrotesk.className} style={{ fontSize: 18, fontWeight: 700, color: "#241B2F", marginBottom: 6 }}>
                  No matches found for &ldquo;{search}&rdquo;
                </h3>
                <p style={{ fontSize: 14, color: "#5C5468", marginBottom: 20 }}>
                  Try checking for typos or search for different cities, trips, or activity categories.
                </p>
                <button
                  onClick={() => setSearch("")}
                  style={{
                    padding: "8px 20px",
                    background: "#F1E7EE",
                    color: "#714B67",
                    border: "1px solid #714B67",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
                {/* 1. Cities Results */}
                {(activeTab === "all" || activeTab === "cities") && searchResults.matchedCities.length > 0 && (
                  <div>
                    <SectionHeader title={`Destinations & Cities (${searchResults.matchedCities.length})`} />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: 16,
                      }}
                    >
                      {searchResults.matchedCities.map((city) => (
                        <RealCityCard key={city.id} city={city} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Trips Results */}
                {(activeTab === "all" || activeTab === "trips") && searchResults.matchedTrips.length > 0 && (
                  <div>
                    <SectionHeader title={`Trips & Itineraries (${searchResults.matchedTrips.length})`} />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: 20,
                      }}
                    >
                      {searchResults.matchedTrips.map((trip) => (
                        <RealTripCard key={trip.id} trip={trip} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Activities / Places Results */}
                {(activeTab === "all" || activeTab === "activities") && searchResults.matchedActivities.length > 0 && (
                  <div>
                    <SectionHeader title={`Places & Activities (${searchResults.matchedActivities.length})`} />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                        gap: 16,
                      }}
                    >
                      {searchResults.matchedActivities.map((act) => (
                        <RealActivityCard key={act.id} activity={act} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          /* ── DEFAULT DASHBOARD VIEW (Cities & Trips) ── */
          <>
            {/* ── Top Regional Selections (Real Cities from Database) ── */}
            <section id="top-regional" style={{ marginBottom: 44 }}>
              <SectionHeader title="Explore Destinations" />
              {loading ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      style={{
                        height: 200,
                        background: "#F1EDE6",
                        borderRadius: "14px",
                        animation: "pulse 1.5s infinite",
                      }}
                    />
                  ))}
                </div>
              ) : displayedCities.length === 0 ? (
                <p style={{ color: "#5C5468", fontSize: 14 }}>
                  No destinations found matching your current filter.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                    gap: 16,
                  }}
                >
                  {displayedCities.slice(0, 10).map((city) => (
                    <RealCityCard key={city.id} city={city} />
                  ))}
                </div>
              )}
            </section>

            {/* ── User Trips (Real Trips from Database) ── */}
            <section id="previous-trips" style={{ marginBottom: 48 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <SectionHeader title="Your Trips & Itineraries" />
                <Link
                  href="/trips"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#714B67",
                    textDecoration: "none",
                  }}
                >
                  View All Trips →
                </Link>
              </div>

              {loading ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      style={{
                        height: 240,
                        background: "#F1EDE6",
                        borderRadius: "14px",
                        animation: "pulse 1.5s infinite",
                      }}
                    />
                  ))}
                </div>
              ) : trips.length === 0 ? (
                /* Empty state for trips */
                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "14px",
                    border: "1px solid #E7E0D4",
                    padding: "36px 24px",
                    textAlign: "center",
                    boxShadow: "0 1px 2px rgba(36,27,47,0.04)",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🧳</div>
                  <h3 className={spaceGrotesk.className} style={{ fontSize: 17, fontWeight: 700, color: "#241B2F", marginBottom: 4 }}>
                    No trips planned yet
                  </h3>
                  <p style={{ fontSize: 14, color: "#5C5468", marginBottom: 16 }}>
                    Build your first multi-city route, schedule activities, and manage your budget with GlobeTrotter.
                  </p>
                  <Link href="/trips/new" style={{ textDecoration: "none" }}>
                    <button
                      style={{
                        padding: "8px 20px",
                        background: "#714B67",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Plan Your First Trip
                    </button>
                  </Link>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 20,
                  }}
                >
                  {trips.map((trip) => (
                    <RealTripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* ── Floating CTA ─────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: 32,
          right: 36,
          zIndex: 40,
        }}
      >
        <Link href="/trips/new" style={{ textDecoration: "none" }}>
          <button
            id="plan-trip-btn"
            style={{
              height: 50,
              padding: "0 24px",
              background: "#714B67",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(113,75,103,0.35)",
              transition: "background 150ms, transform 150ms, box-shadow 150ms",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <line x1="9" y1="2" x2="9" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="9" x2="16" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Plan a trip
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Helper & Sub-components for Clean, Minimal, Detailed View
   ──────────────────────────────────────────────────────────── */

function getCostTier(costIndex: number): string {
  if (costIndex <= 1.2) return "Budget-Friendly";
  if (costIndex <= 2.0) return "Moderate";
  return "Luxury";
}

function getCostBadge(costIndex: number): { label: string; color: string } {
  if (costIndex <= 1.2) return { label: "€€", color: "#2F7A6F" };
  if (costIndex <= 2.0) return { label: "€€€", color: "#EFA928" };
  return { label: "€€€€", color: "#C0392B" };
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 16,
        flex: 1,
      }}
    >
      <h2
        className={spaceGrotesk.className}
        style={{
          fontWeight: 700,
          fontSize: 20,
          color: "#241B2F",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          flex: 1,
          height: 1,
          background: "#E7E0D4",
        }}
      />
    </div>
  );
}

/* ── Clean & Detailed Real City Card ── */
function RealCityCard({ city }: { city: City }) {
  const [hovered, setHovered] = useState(false);
  const badge = getCostBadge(city.costIndex || 1.0);

  return (
    <Link href={`/trips/new?cityId=${city.id}`} style={{ textDecoration: "none" }}>
      <article
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "#FFFFFF",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: hovered ? "0 4px 12px rgba(36,27,47,0.10)" : "0 1px 2px rgba(36,27,47,0.04)",
          border: "1px solid #E7E0D4",
          cursor: "pointer",
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          transition: "box-shadow 150ms, transform 150ms",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* City Image */}
        <div style={{ position: "relative", height: 125, overflow: "hidden", background: "#F1EDE6" }}>
          {city.imageUrl ? (
            <img
              src={city.imageUrl}
              alt={`${city.name}, ${city.country}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: hovered ? "brightness(0.92)" : "brightness(1)",
                transition: "filter 150ms, transform 200ms",
                transform: hovered ? "scale(1.03)" : "scale(1)",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#714B67",
                fontWeight: 700,
                fontSize: 24,
                background: "#F1E7EE",
              }}
            >
              {city.name.charAt(0)}
            </div>
          )}

          {/* Cost badge */}
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: badge.color,
              color: "#fff",
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "99px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          >
            {badge.label}
          </span>
        </div>

        {/* Info */}
        <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <p
              className={spaceGrotesk.className}
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "#241B2F",
                marginBottom: 2,
                lineHeight: "18px",
              }}
            >
              {city.name}
            </p>
            <p
              className={inter.className}
              style={{
                fontSize: 12,
                color: "#5C5468",
              }}
            >
              {city.country} {city.region ? `• ${city.region}` : ""}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid #E7E0D4",
              fontSize: 11,
              color: "#714B67",
              fontWeight: 600,
            }}
          >
            <span>Plan visit</span>
            <span>+</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

/* ── Clean & Detailed Real Trip Card ── */
function RealTripCard({ trip }: { trip: Trip }) {
  const [hovered, setHovered] = useState(false);

  const formattedDates = trip.startDate && trip.endDate
    ? `${new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : "Dates TBD";

  const stopsCount = trip.stops?.length || trip._count?.stops || 0;
  const status = trip.status || (new Date(trip.endDate) < new Date() ? "completed" : "upcoming");

  const statusStyle: Record<string, { bg: string; color: string; border: string }> = {
    ongoing: { bg: "rgba(224,102,61,0.15)", color: "#E0663D", border: "#E0663D" },
    upcoming: { bg: "rgba(47,122,111,0.15)", color: "#2F7A6F", border: "#2F7A6F" },
    completed: { bg: "rgba(92,84,104,0.15)", color: "#5C5468", border: "#D6CCBC" },
  };

  const st = statusStyle[status] || statusStyle.upcoming;

  return (
    <article
      id={`trip-card-${trip.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#FFFFFF",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: hovered ? "0 4px 12px rgba(36,27,47,0.10)" : "0 1px 2px rgba(36,27,47,0.04)",
        border: "1px solid #E7E0D4",
        cursor: "pointer",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "box-shadow 150ms, transform 150ms",
        position: "relative",
      }}
    >
      {/* Cover image */}
      <div style={{ position: "relative", height: 160, overflow: "hidden", background: "#F1EDE6" }}>
        {trip.coverPhoto ? (
          <img
            src={trip.coverPhoto}
            alt={trip.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: hovered ? "brightness(0.88)" : "brightness(1)",
              transition: "filter 150ms",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #714B67 0%, #3A2337 100%)",
            }}
          />
        )}
        {/* Gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(36,27,47,0.7) 0%, transparent 60%)",
          }}
        />
        {/* Status badge */}
        <span
          style={{
            position: "absolute",
            top: 10,
            left: 12,
            background: st.bg,
            border: `1px solid ${st.border}`,
            color: st.color,
            fontWeight: 600,
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: "99px",
            textTransform: "capitalize",
          }}
        >
          {status}
        </span>
        {/* Trip name on image */}
        <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
          <h3
            className={spaceGrotesk.className}
            style={{
              fontWeight: 700,
              fontSize: 17,
              color: "#ffffff",
              lineHeight: "22px",
            }}
          >
            {trip.name}
          </h3>
        </div>
      </div>

      {/* Body — ticket stub style */}
      <div style={{ padding: "14px 16px", display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              color: "#5C5468",
              marginBottom: 4,
            }}
          >
            {formattedDates}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: "#5C5468",
              }}
            >
              <svg width="8" height="8" viewBox="0 0 10 10">
                <circle cx="5" cy="5" r="4" fill="#714B67" />
              </svg>
              {stopsCount} {stopsCount === 1 ? "stop" : "stops"}
            </span>
          </div>
        </div>

        {/* Perforated divider */}
        <div
          style={{
            width: 1,
            height: 36,
            borderLeft: "2px dashed #E7E0D4",
          }}
        />

        {/* Right: action */}
        <div style={{ textAlign: "right" }}>
          <Link href={`/trips/${trip.id}`} style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "6px 14px",
                background: "#F1E7EE",
                border: "1px solid #714B67",
                borderRadius: "8px",
                color: "#714B67",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              View Plan →
            </button>
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ── Clean & Detailed Real Activity Card ── */
function RealActivityCard({
  activity,
}: {
  activity: Activity & { city?: { id: string; name: string; country: string } };
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#FFFFFF",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: hovered ? "0 4px 12px rgba(36,27,47,0.10)" : "0 1px 2px rgba(36,27,47,0.04)",
        border: "1px solid #E7E0D4",
        cursor: "pointer",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "box-shadow 150ms, transform 150ms",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Activity Image */}
      <div style={{ position: "relative", height: 110, overflow: "hidden", background: "#F1EDE6" }}>
        {activity.imageUrl ? (
          <img
            src={activity.imageUrl}
            alt={activity.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              background: "#F1EDE6",
            }}
          >
            🎯
          </div>
        )}

        {/* Category Pill */}
        <span
          style={{
            position: "absolute",
            bottom: 6,
            left: 8,
            background: "rgba(36,27,47,0.75)",
            backdropFilter: "blur(4px)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: 4,
            textTransform: "capitalize",
          }}
        >
          {activity.category.toLowerCase()}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <h4
            className={spaceGrotesk.className}
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#241B2F",
              marginBottom: 2,
              lineHeight: "18px",
            }}
          >
            {activity.name}
          </h4>
          {activity.city && (
            <p style={{ fontSize: 11, color: "#5C5468", marginBottom: 4 }}>
              📍 {activity.city.name}, {activity.city.country}
            </p>
          )}
          {activity.description && (
            <p
              style={{
                fontSize: 11,
                color: "#5C5468",
                lineHeight: "15px",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {activity.description}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            paddingTop: 6,
            borderTop: "1px solid #E7E0D4",
            fontSize: 11,
            fontFamily: "monospace",
            color: "#241B2F",
          }}
        >
          <span>{activity.cost > 0 ? `$${activity.cost}` : "Free"}</span>
          <span style={{ color: "#9A93A6" }}>{activity.durationMin} min</span>
        </div>
      </div>
    </article>
  );
}

function Dropdown({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        background: "#FFFFFF",
        border: "1px solid #E7E0D4",
        borderRadius: "14px",
        boxShadow: "0 4px 12px rgba(36,27,47,0.10)",
        minWidth: 180,
        zIndex: 100,
        overflow: "hidden",
      }}
    >
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
        background: active ? "#F1E7EE" : "transparent",
        color: active ? "#714B67" : "#5C5468",
        fontWeight: active ? 600 : 400,
        fontSize: 14,
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 100ms",
      }}
    >
      {multi && (
        <span
          style={{
            width: 16,
            height: 16,
            border: `2px solid ${active ? "#714B67" : "#D6CCBC"}`,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: active ? "#714B67" : "transparent",
            flexShrink: 0,
          }}
        >
          {active && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      )}
      {!multi && active && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#714B67",
            flexShrink: 0,
          }}
        />
      )}
      {!multi && !active && <span style={{ width: 6, height: 6, flexShrink: 0 }} />}
      {label}
    </button>
  );
}
