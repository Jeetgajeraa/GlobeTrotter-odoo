"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";

import { AppNav } from "@/src/components/AppNav";
import { getUserTrips } from "@/src/libs/interaction/dataGetter";
import { apiClient } from "@/src/libs/interaction";
import { useToast } from "@/src/hooks/useToast";
import { Trip, TripStatus, GroupedTripsResponse } from "@/src/libs/types";
import { BASE_URL } from "@/src/libs/constants";

/* ── Fonts ─────────────────────────────────────────────── */
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const inter        = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmPlexMono  = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"] });

/* ── Badge palette ─────────────────────────────────────── */
const statusStyle: Record<TripStatus, { bg: string; text: string; border: string; label: string }> = {
  ongoing:   { bg: "rgba(47,122,111,0.10)",  text: "#2F7A6F", border: "#2F7A6F", label: "Ongoing"   },
  upcoming:  { bg: "#F1E7EE",                text: "#714B67", border: "#714B67", label: "Upcoming"  },
  completed: { bg: "rgba(36,27,47,0.06)",    text: "#5C5468", border: "#9A93A6", label: "Completed" },
};

/* ── Helpers ───────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function tripDays(start: string, end: string) {
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
  return diff + (diff === 1 ? " day" : " days");
}

/* ── Sort options ──────────────────────────────────────── */
const SORT_OPTIONS = [
  { label: "Start date ↑", value: "startDate:asc"   },
  { label: "Start date ↓", value: "startDate:desc"  },
  { label: "Name A–Z",     value: "name:asc"        },
  { label: "Name Z–A",     value: "name:desc"       },
  { label: "Date created", value: "createdAt:desc"  },
] as const;

type SortValue = typeof SORT_OPTIONS[number]["value"];

/* ══════════════════════════════════════════════════════════
   Page
   ══════════════════════════════════════════════════════════ */
export default function TripsPage() {
  const router   = useRouter();
  const qc       = useQueryClient();
  const { toast } = useToast();

  /* ── Filter / search state ───────────────────── */
  const [search,      setSearch]      = useState("");
  const [activeTab,   setActiveTab]   = useState<"all" | TripStatus>("all");
  const [sortValue,   setSortValue]   = useState<SortValue>("startDate:asc");
  const [sortOpen,    setSortOpen]    = useState(false);
  const [deleteId,    setDeleteId]    = useState<string | null>(null); // inline confirm

  const [sortBy, sortOrder] = sortValue.split(":") as [string, "asc" | "desc"];

  /* ── Fetch trips grouped ─────────────────────── */
  const { data: groupedRes, isLoading, isError } = useQuery({
    queryKey: ["trips", "grouped"],
    queryFn: () => getUserTrips({ groupByStatus: true }),
    retry: false,
  });

  /* ── Delete trip mutation ────────────────────── */
  const { mutate: deleteTrip, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`${BASE_URL}/api/trips/${id}`).then((r) => r.data),
    onSuccess(_, id) {
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Trip deleted", description: "The trip has been removed." });
      if (deleteId === id) setDeleteId(null);
    },
    onError(err: Error) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  /* ── Redirect on auth failure ────────────────── */
  if (isError) { router.push("/auth"); return null; }

  /* ── Derive flat filtered list ───────────────── */
  const grouped = (groupedRes as GroupedTripsResponse)?.data;

  const allTrips: Trip[] = useMemo(() => {
    if (!grouped) return [];
    return [...grouped.ongoing, ...grouped.upcoming, ...grouped.completed];
  }, [grouped]);

  const filtered: Trip[] = useMemo(() => {
    let list =
      activeTab === "all"        ? allTrips
      : activeTab === "ongoing"  ? (grouped?.ongoing  ?? [])
      : activeTab === "upcoming" ? (grouped?.upcoming ?? [])
      :                            (grouped?.completed ?? []);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.stops.some((s) => s.city.name.toLowerCase().includes(q)),
      );
    }

    return [...list].sort((a, b) => {
      const va = a[sortBy as keyof Trip] as string | number;
      const vb = b[sortBy as keyof Trip] as string | number;
      if (va < vb) return sortOrder === "asc" ? -1 : 1;
      if (va > vb) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [allTrips, grouped, activeTab, search, sortBy, sortOrder]);

  /* Grouped view (when tab = "all", show three sections) */
  const showGrouped = activeTab === "all" && !search.trim();

  const sections: { key: TripStatus; label: string; trips: Trip[] }[] = [
    { key: "ongoing",   label: "Ongoing",   trips: grouped?.ongoing   ?? [] },
    { key: "upcoming",  label: "Up-coming", trips: grouped?.upcoming  ?? [] },
    { key: "completed", label: "Completed", trips: grouped?.completed ?? [] },
  ];

  return (
    <div className={`min-h-screen bg-[#FAF8F5] ${inter.className}`}>
      <AppNav />

      <main
        className="max-w-[1120px] mx-auto px-12 py-8"
        style={{ animation: "fadeRise 200ms ease-out" }}
      >
        {/* ── Page header ─────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-[30px] font-semibold text-[#241B2F] tracking-tight ${spaceGrotesk.className}`}>
            My trips
          </h1>
          <Link
            href="/trips/new"
            id="plan-new-trip-btn"
            className="h-11 px-5 bg-[#714B67] hover:bg-[#4E3347] active:scale-[0.98]
              text-white font-semibold text-[14px] rounded-lg
              flex items-center gap-2 transition-all duration-150
              outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE]
              shadow-[0_4px_12px_rgba(113,75,103,0.22)]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="7" y1="1" x2="7" y2="13" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="1" y1="7" x2="13" y2="7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Plan new trip
          </Link>
        </div>

        {/* ── Search + Sort bar ───────────────────── */}
        <div className="flex gap-3 items-center mb-5">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="#9A93A6" strokeWidth="1.5"/>
              <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke="#9A93A6"
                strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              id="trips-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trips, cities…"
              className="w-full h-10 pl-10 pr-4 bg-[#F1EDE6] rounded-lg text-[14px]
                text-[#241B2F] placeholder:text-[#9A93A6] border border-transparent
                outline-none transition-all duration-150
                hover:border-[#D6CCBC]
                focus:border-[#714B67] focus:shadow-[0_0_0_3px_#F1E7EE] focus:bg-white"
            />
          </div>

          {/* Sort by */}
          <div className="relative">
            <button
              id="trips-sort-btn"
              onClick={() => setSortOpen((p) => !p)}
              className={`h-10 px-4 flex items-center gap-2 rounded-lg text-[14px] font-medium
                border transition-all duration-150 cursor-pointer
                outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE]
                ${sortOpen
                  ? "bg-[#F1E7EE] border-[#714B67] text-[#714B67]"
                  : "bg-white border-[#E7E0D4] text-[#5C5468] hover:border-[#D6CCBC]"}`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4h10M4 7h6M6 10h2" stroke="currentColor"
                  strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Sort by: {SORT_OPTIONS.find((o) => o.value === sortValue)?.label}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                style={{ transform: sortOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] bg-white border border-[#E7E0D4]
                rounded-[14px] shadow-[0_4px_12px_rgba(36,27,47,0.10)] min-w-[180px] z-40 overflow-hidden">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortValue(opt.value); setSortOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-[13px] flex items-center gap-2
                      transition-colors duration-100 cursor-pointer
                      ${sortValue === opt.value
                        ? "bg-[#F1E7EE] text-[#714B67] font-semibold"
                        : "text-[#5C5468] hover:bg-[#FAF8F5]"}`}
                  >
                    {sortValue === opt.value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#714B67] flex-shrink-0" />
                    )}
                    {sortValue !== opt.value && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Tab row ─────────────────────────────── */}
        <div className="flex border-b border-[#E7E0D4] mb-7" role="tablist">
          {(["all", "ongoing", "upcoming", "completed"] as const).map((tab) => {
            const active = activeTab === tab;
            const count =
              tab === "all"       ? allTrips.length
              : tab === "ongoing"   ? (grouped?.ongoing?.length   ?? 0)
              : tab === "upcoming"  ? (grouped?.upcoming?.length  ?? 0)
              :                       (grouped?.completed?.length ?? 0);
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={active}
                id={`tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={[
                  "relative flex items-center gap-1.5 px-4 py-2.5 text-[14px] cursor-pointer",
                  "after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:w-full after:h-0.5",
                  "after:transition-transform after:duration-200 after:ease-out after:bg-[#714B67]",
                  "outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE] rounded-t",
                  spaceGrotesk.className,
                  active
                    ? "text-[#241B2F] font-semibold after:scale-x-100"
                    : "text-[#5C5468] font-medium after:scale-x-0 hover:text-[#241B2F]",
                ].join(" ")}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {count > 0 && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${ibmPlexMono.className}
                    ${active ? "bg-[#F1E7EE] text-[#714B67]" : "bg-[#F1EDE6] text-[#9A93A6]"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content area ─────────────────────────── */}
        {isLoading ? (
          <TripsSkeleton />
        ) : showGrouped ? (
          /* ── Grouped view (Screen 6 wireframe) ── */
          <div className="flex flex-col gap-10">
            {sections.map(({ key, label, trips }) =>
              trips.length === 0 ? null : (
                <section key={key} id={`section-${key}`}>
                  <GroupSectionHeader label={label} status={key} count={trips.length} />
                  <div className="flex flex-col gap-4">
                    {trips.map((trip) => (
                      <TripRow
                        key={trip.id}
                        trip={trip}
                        deleteId={deleteId}
                        isDeleting={isDeleting}
                        onDelete={() => setDeleteId(trip.id)}
                        onCancelDelete={() => setDeleteId(null)}
                        onConfirmDelete={() => deleteTrip(trip.id)}
                      />
                    ))}
                  </div>
                </section>
              )
            )}
            {allTrips.length === 0 && <TripsEmptyState label="all" onPlan={() => router.push("/trips/new")} />}
          </div>
        ) : (
          /* ── Flat filtered list ── */
          <div className="flex flex-col gap-4">
            {filtered.map((trip) => (
              <TripRow
                key={trip.id}
                trip={trip}
                deleteId={deleteId}
                isDeleting={isDeleting}
                onDelete={() => setDeleteId(trip.id)}
                onCancelDelete={() => setDeleteId(null)}
                onConfirmDelete={() => deleteTrip(trip.id)}
              />
            ))}
            {filtered.length === 0 && (
              <TripsEmptyState label={activeTab} onPlan={() => router.push("/trips/new")} />
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeRise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════ */

/** Section header with horizontal rule — matches wireframe "Ongoing ———" */
function GroupSectionHeader({ label, status, count }: { label: string; status: TripStatus; count: number }) {
  const { text, border } = statusStyle[status];
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className={`text-[22px] font-semibold text-[#241B2F] whitespace-nowrap ${spaceGrotesk.className}`}>
        {label}
      </h2>
      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ibmPlexMono.className}`}
        style={{ color: text, borderColor: border, background: statusStyle[status].bg }}>
        {count}
      </span>
      <div className="flex-1 h-px bg-[#E7E0D4]" />
    </div>
  );
}

/** Full-width trip row card — the "Short Overview of the Trip" from the wireframe */
function TripRow({
  trip,
  deleteId,
  isDeleting,
  onDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  trip: Trip;
  deleteId: string | null;
  isDeleting: boolean;
  onDelete:        () => void;
  onCancelDelete:  () => void;
  onConfirmDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const ibm = ibmPlexMono;
  const sg  = spaceGrotesk;
  const it  = inter;

  const st   = statusStyle[trip.status];
  const days = tripDays(trip.startDate, trip.endDate);
  const confirmMode = deleteId === trip.id;

  /* Route-line dots from stops */
  const stopCities = trip.stops.slice(0, 4);

  return (
    <article
      id={`trip-row-${trip.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-white rounded-[14px] border border-[#E7E0D4] overflow-hidden"
      style={{
        boxShadow: hovered
          ? "0 4px 12px rgba(36,27,47,0.10)"
          : "0 1px 2px rgba(36,27,47,0.04), 0 8px 24px rgba(36,27,47,0.06)",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        transition: "box-shadow 150ms, transform 150ms",
      }}
    >
      <div className="flex gap-0">
        {/* Cover photo strip */}
        {trip.coverPhoto && (
          <div className="relative w-[180px] flex-shrink-0 hidden md:block">
            <Image
              src={trip.coverPhoto}
              alt={trip.name}
              fill
              sizes="180px"
              className="object-cover"
              style={{
                filter: hovered ? "brightness(0.88)" : "brightness(1)",
                transition: "filter 150ms",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 p-5 flex flex-col gap-3 min-w-0">
          {/* Top row: name + badge + actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              <h3 className={`text-[18px] font-semibold text-[#241B2F] truncate ${sg.className}`}>
                {trip.name}
              </h3>
              <span
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border flex-shrink-0 ${it.className}`}
                style={{ background: st.bg, color: st.text, borderColor: st.border }}
              >
                {st.label}
              </span>
              {trip.isPublic && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border
                  border-[#E7E0D4] text-[#9A93A6] bg-[#FAF8F5] flex-shrink-0">
                  Public
                </span>
              )}
            </div>

            {/* Action buttons — always visible on wide, hover-only on narrow */}
            {!confirmMode ? (
              <div className={`flex items-center gap-2 flex-shrink-0 transition-opacity duration-150
                ${hovered ? "opacity-100" : "opacity-0 md:opacity-0"}`}>
                <Link
                  href={`/trips/${trip.id}`}
                  id={`trip-view-${trip.id}`}
                  className="h-8 px-3 text-[13px] font-medium text-[#714B67]
                    border border-[#714B67] rounded-lg hover:bg-[#F1E7EE]
                    transition-colors duration-150 flex items-center gap-1.5
                    outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE]"
                >
                  View
                </Link>
                <Link
                  href={`/trips/${trip.id}/edit`}
                  id={`trip-edit-${trip.id}`}
                  className="h-8 px-3 text-[13px] font-medium text-[#5C5468]
                    border border-[#E7E0D4] rounded-lg hover:border-[#D6CCBC] hover:text-[#241B2F]
                    transition-colors duration-150 flex items-center gap-1.5
                    outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE]"
                >
                  Edit
                </Link>
                <button
                  id={`trip-delete-${trip.id}`}
                  onClick={onDelete}
                  className="h-8 px-3 text-[13px] font-medium text-[#9A93A6]
                    border border-[#E7E0D4] rounded-lg
                    hover:border-[#C0392B] hover:text-[#C0392B] hover:bg-red-50
                    transition-colors duration-150 cursor-pointer
                    outline-none focus-visible:shadow-[0_0_0_3px_#fee2e2]"
                >
                  Delete
                </button>
              </div>
            ) : (
              /* Inline confirm delete */
              <div className="flex items-center gap-2 flex-shrink-0 animate-[panelIn_0.15s_ease-out]">
                <span className="text-[13px] text-[#241B2F] font-medium">
                  Delete this trip?
                </span>
                <button
                  id={`trip-confirm-delete-${trip.id}`}
                  onClick={onConfirmDelete}
                  disabled={isDeleting}
                  className="h-8 px-3 text-[13px] font-semibold text-white
                    bg-[#C0392B] hover:bg-red-800 rounded-lg
                    transition-colors duration-150 cursor-pointer disabled:opacity-60
                    outline-none focus-visible:shadow-[0_0_0_3px_#fee2e2]"
                >
                  {isDeleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  id={`trip-cancel-delete-${trip.id}`}
                  onClick={onCancelDelete}
                  className="h-8 px-3 text-[13px] font-medium text-[#5C5468]
                    border border-[#E7E0D4] rounded-lg hover:border-[#D6CCBC]
                    transition-colors duration-150 cursor-pointer
                    outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          {trip.description && (
            <p className="text-[13px] text-[#5C5468] leading-relaxed line-clamp-2">
              {trip.description}
            </p>
          )}

          {/* Route line */}
          {stopCities.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto">
              {stopCities.map((stop, i) => (
                <div key={stop.id} className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex flex-col items-center gap-0.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        background: i === 0 ? "#714B67" : "transparent",
                        border: i === 0 ? "none" : "2px solid #714B67",
                      }}
                    />
                    <span className={`text-[10px] text-[#9A93A6] whitespace-nowrap ${ibm.className}`}>
                      {stop.city.name.slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                  {i < stopCities.length - 1 && (
                    <div className="w-10 h-[2px] flex-shrink-0"
                      style={{
                        background: "repeating-linear-gradient(to right,#E0663D 0,#E0663D 4px,transparent 4px,transparent 8px)",
                      }}
                    />
                  )}
                </div>
              ))}
              {trip._count.stops > 4 && (
                <span className={`text-[11px] text-[#9A93A6] ${ibm.className}`}>
                  +{trip._count.stops - 4} more
                </span>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-5 flex-wrap">
            {/* Dates */}
            <StatChip
              icon={
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="#9A93A6" strokeWidth="1.2"/>
                  <line x1="1" y1="5" x2="11" y2="5" stroke="#9A93A6" strokeWidth="1.2"/>
                  <line x1="4" y1="1" x2="4" y2="3" stroke="#9A93A6" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="8" y1="1" x2="8" y2="3" stroke="#9A93A6" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              }
              value={`${fmtDate(trip.startDate)} — ${fmtDate(trip.endDate)}`}
              mono
              ibm={ibm.className}
            />
            {/* Duration */}
            <StatChip
              icon={
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="#9A93A6" strokeWidth="1.2"/>
                  <path d="M6 3.5V6l1.5 1.5" stroke="#9A93A6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              value={days}
              mono
              ibm={ibm.className}
            />
            {/* Stops */}
            <StatChip
              icon={
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="5" r="2.5" stroke="#9A93A6" strokeWidth="1.2"/>
                  <path d="M6 1C3.79 1 2 2.79 2 5c0 3 4 7 4 7s4-4 4-7c0-2.21-1.79-4-4-4z"
                    stroke="#9A93A6" strokeWidth="1.2"/>
                </svg>
              }
              value={`${trip._count.stops} ${trip._count.stops === 1 ? "stop" : "stops"}`}
              ibm={ibm.className}
            />
            {/* Budget */}
            {trip.totalExpense > 0 && (
              <StatChip
                icon={
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="1" y="3" width="10" height="7" rx="1" stroke="#9A93A6" strokeWidth="1.2"/>
                    <path d="M4 3V2a2 2 0 014 0v1" stroke="#9A93A6" strokeWidth="1.2"/>
                  </svg>
                }
                value={fmtMoney(trip.totalExpense)}
                mono
                ibm={ibm.className}
                highlight
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function StatChip({
  icon,
  value,
  mono,
  ibm,
  highlight,
}: {
  icon: React.ReactNode;
  value: string;
  mono?: boolean;
  ibm: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span
        className={`text-[12px] ${mono ? ibm : ""}`}
        style={{ color: highlight ? "#241B2F" : "#5C5468", fontWeight: highlight ? 600 : 400 }}
      >
        {value}
      </span>
    </div>
  );
}

function TripsEmptyState({
  label,
  onPlan,
}: {
  label: string;
  onPlan: () => void;
}) {
  const messages: Record<string, string> = {
    all:       "No trips yet — add your first city to start the route",
    ongoing:   "No trips in progress right now — your ongoing adventures will appear here",
    upcoming:  "Nothing planned ahead — start building your next trip",
    completed: "No past trips yet — they'll show up here once a trip's dates have passed",
  };
  return (
    <div className="py-20 flex flex-col items-center text-center gap-5">
      {/* Simple line illustration */}
      <svg width="64" height="40" viewBox="0 0 64 40" fill="none">
        <circle cx="8" cy="20" r="6" fill="#F1E7EE" stroke="#714B67" strokeWidth="2"/>
        <line x1="14" y1="20" x2="28" y2="20" stroke="#E0663D" strokeWidth="2" strokeDasharray="4 4"/>
        <circle cx="32" cy="20" r="4" stroke="#9A93A6" strokeWidth="2" fill="none"/>
        <line x1="36" y1="20" x2="50" y2="20" stroke="#E0663D" strokeWidth="2" strokeDasharray="4 4"/>
        <circle cx="56" cy="20" r="4" stroke="#9A93A6" strokeWidth="2" fill="none"/>
      </svg>
      <p className={`text-[17px] font-semibold text-[#241B2F] max-w-[340px] leading-snug ${spaceGrotesk.className}`}>
        {messages[label] ?? messages.all}
      </p>
      <button
        id="empty-plan-btn"
        onClick={onPlan}
        className="h-11 px-6 bg-[#714B67] hover:bg-[#4E3347] active:scale-[0.98]
          text-white font-semibold text-[14px] rounded-lg
          transition-all duration-150 cursor-pointer
          shadow-[0_4px_12px_rgba(113,75,103,0.22)]
          outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE]"
      >
        Plan a trip
      </button>
    </div>
  );
}

/* Loading skeleton */
function TripsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-[140px] bg-[#F1EDE6] rounded-[14px]"
          style={{ animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 80}ms` }}
        />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}
