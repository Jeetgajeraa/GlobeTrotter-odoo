"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  Eye,
  X,
  Compass,
} from "lucide-react";

import { AppNav } from "@/src/components/AppNav";
import { getUserCalendar, getMe } from "@/src/libs/interaction/dataGetter";
import { useToast } from "@/src/hooks/useToast";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"] });

/* ── Trip event as returned by GET /api/calendar ── */
interface CalendarCity {
  id: string;
  name: string;
  country: string;
  startDate: string;
  endDate: string;
}

interface CalendarEvent {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  coverPhoto: string | null;
  isPublic: boolean;
  shareSlug: string | null;
  status: "ongoing" | "upcoming" | "completed";
  totalExpense: number;
  stopsCount: number;
  cities: CalendarCity[];
}

/* ── Color palette for trip event bars ── */
const TRIP_COLORS = [
  { bg: "bg-[#714B67]/15", border: "border-[#714B67]/40", text: "text-[#714B67]", solid: "#714B67" },
  { bg: "bg-[#2F7A6F]/15", border: "border-[#2F7A6F]/40", text: "text-[#2F7A6F]", solid: "#2F7A6F" },
  { bg: "bg-[#E0663D]/15", border: "border-[#E0663D]/40", text: "text-[#E0663D]", solid: "#E0663D" },
  { bg: "bg-[#EFA928]/15", border: "border-[#EFA928]/40", text: "text-[#EFA928]", solid: "#EFA928" },
  { bg: "bg-[#241B2F]/10", border: "border-[#241B2F]/30", text: "text-[#241B2F]", solid: "#241B2F" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ── Helpers ── */
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarViewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const now = new Date();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Auth check
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["authMe"],
    queryFn: getMe,
  });

  const currentUser = userData?.data?.user;

  useEffect(() => {
    if (!isUserLoading && userData && !currentUser) {
      toast({ title: "Please sign in", description: "Calendar requires authentication.", variant: "destructive" });
      router.push("/auth");
    }
  }, [isUserLoading, userData, currentUser, router, toast]);

  // Fetch calendar data
  const { data: calendarRes, isLoading: isCalLoading } = useQuery({
    queryKey: ["userCalendar", viewYear, viewMonth],
    queryFn: () => getUserCalendar({ year: viewYear, month: viewMonth + 1 }),
    enabled: !!currentUser,
  });

  const events: CalendarEvent[] = calendarRes?.data?.events || [];

  /* ── Navigate months ── */
  const goToPrevMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 0) { setViewYear((y) => y - 1); return 11; }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 11) { setViewYear((y) => y + 1); return 0; }
      return prev + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }, [now]);

  /* ── Build calendar grid ── */
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getFirstDayOfMonth(viewYear, viewMonth);

  // Map: dateKey → list of events active on that date
  const dateEventMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    events.forEach((evt) => {
      const evtStart = new Date(evt.startDate);
      const evtEnd = new Date(evt.endDate);

      // Clamp to current month for rendering
      const monthStart = new Date(viewYear, viewMonth, 1);
      const monthEnd = new Date(viewYear, viewMonth, daysInMonth);

      const renderStart = evtStart < monthStart ? monthStart : evtStart;
      const renderEnd = evtEnd > monthEnd ? monthEnd : evtEnd;

      const dt = new Date(renderStart);
      dt.setHours(0, 0, 0, 0);
      const endDt = new Date(renderEnd);
      endDt.setHours(0, 0, 0, 0);

      while (dt <= endDt) {
        const key = toDateKey(dt);
        if (!map[key]) map[key] = [];
        if (!map[key].find((e) => e.id === evt.id)) {
          map[key].push(evt);
        }
        dt.setDate(dt.getDate() + 1);
      }
    });

    return map;
  }, [events, viewYear, viewMonth, daysInMonth]);

  // Assign a stable color to each trip by index
  const tripColorMap = useMemo(() => {
    const map: Record<string, (typeof TRIP_COLORS)[0]> = {};
    events.forEach((e, idx) => {
      map[e.id] = TRIP_COLORS[idx % TRIP_COLORS.length];
    });
    return map;
  }, [events]);

  const selectedTrip = selectedTripId ? events.find((e) => e.id === selectedTripId) || null : null;

  // Loading state
  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#714B67]/20 border-t-[#714B67] rounded-full animate-spin mb-4" />
        <p className={`${inter.className} text-[14px] text-[#5C5468]`}>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#FAF8F5] text-[#241B2F] ${inter.className}`}>
      <AppNav />

      <main className="max-w-[1120px] mx-auto px-12 py-8">
        {/* ── Page Title ── */}
        <div className="mb-6">
          <h1 className={`${spaceGrotesk.className} text-[30px] font-semibold text-[#241B2F] tracking-tight`}>
            Calendar View
          </h1>
          <p className="text-[14px] text-[#5C5468] mt-1">
            Visualize all your trips on a monthly calendar. Click a trip to see details.
          </p>
        </div>

        {/* ── Month Navigation ── */}
        <div className="bg-white rounded-xl border border-[#E7E0D4] shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#E7E0D4]">
            <button
              onClick={goToPrevMonth}
              className="w-10 h-10 rounded-lg border border-[#E7E0D4] hover:bg-[#F1EDE6] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-[#5C5468]" />
            </button>

            <div className="text-center">
              <h2 className={`${spaceGrotesk.className} text-[24px] sm:text-[28px] font-bold text-[#241B2F]`}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>
              <button
                onClick={goToToday}
                className={`${ibmPlexMono.className} text-[12px] text-[#714B67] hover:text-[#4E3347] mt-1 cursor-pointer underline-offset-2 hover:underline transition-colors`}
              >
                Go to Today
              </button>
            </div>

            <button
              onClick={goToNextMonth}
              className="w-10 h-10 rounded-lg border border-[#E7E0D4] hover:bg-[#F1EDE6] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 text-[#5C5468]" />
            </button>
          </div>

          {/* ── Day-of-week Headers ── */}
          <div className="grid grid-cols-7 border-b border-[#E7E0D4]">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="py-3 text-center text-[12px] font-semibold text-[#5C5468] uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* ── Calendar Grid ── */}
          {isCalLoading ? (
            <div className="py-20 text-center text-[#5C5468]">
              <div className="w-8 h-8 border-4 border-[#714B67]/20 border-t-[#714B67] rounded-full animate-spin mx-auto mb-3" />
              Loading calendar events...
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="min-h-[110px] border-b border-r border-[#E7E0D4] bg-[#FAF8F5]/50"
                />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                const dayNum = dayIdx + 1;
                const cellDate = new Date(viewYear, viewMonth, dayNum);
                const dateKey = toDateKey(cellDate);
                const cellEvents = dateEventMap[dateKey] || [];
                const isToday = isSameDay(cellDate, now);
                const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;

                return (
                  <div
                    key={dayNum}
                    className={`min-h-[110px] border-b border-r border-[#E7E0D4] p-1.5 flex flex-col relative transition-colors ${
                      isToday
                        ? "bg-[#F1E7EE]/40"
                        : isWeekend
                          ? "bg-[#FAF8F5]"
                          : "bg-white"
                    }`}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`${ibmPlexMono.className} text-[13px] font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                          isToday
                            ? "bg-[#714B67] text-white font-bold"
                            : "text-[#241B2F]"
                        }`}
                      >
                        {dayNum}
                      </span>
                    </div>

                    {/* Trip Event Bars */}
                    <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                      {cellEvents.slice(0, 3).map((evt) => {
                        const color = tripColorMap[evt.id];
                        const tripStart = new Date(evt.startDate);
                        const tripEnd = new Date(evt.endDate);
                        const isFirstDayInMonth =
                          isSameDay(cellDate, tripStart) ||
                          (cellDate.getDate() === 1 && tripStart < cellDate);

                        return (
                          <button
                            key={evt.id}
                            onClick={() => setSelectedTripId(evt.id)}
                            className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold truncate border cursor-pointer transition-all hover:brightness-90 ${color.bg} ${color.border} ${color.text}`}
                            title={`${evt.name} — ${evt.cities.map((c) => c.name).join(", ")}`}
                          >
                            {isFirstDayInMonth ? evt.name.toUpperCase() : ""}
                          </button>
                        );
                      })}
                      {cellEvents.length > 3 && (
                        <span className="text-[10px] text-[#9A93A6] pl-1">
                          +{cellEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Fill remaining cells in the last row */}
              {(() => {
                const totalCells = firstDayOffset + daysInMonth;
                const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
                return Array.from({ length: remainingCells }).map((_, i) => (
                  <div
                    key={`trail-${i}`}
                    className="min-h-[110px] border-b border-r border-[#E7E0D4] bg-[#FAF8F5]/50"
                  />
                ));
              })()}
            </div>
          )}
        </div>

        {/* ── Trip Legend / Active Trips List ── */}
        {events.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-[#E7E0D4] p-5 shadow-xs">
            <h3 className={`${spaceGrotesk.className} text-[16px] font-bold text-[#241B2F] mb-4`}>
              Trips in {MONTH_NAMES[viewMonth]} {viewYear}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {events.map((evt) => {
                const color = tripColorMap[evt.id];
                return (
                  <button
                    key={evt.id}
                    onClick={() => setSelectedTripId(evt.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer text-left hover:shadow-sm ${
                      selectedTripId === evt.id
                        ? `${color.bg} ${color.border} shadow-sm`
                        : "border-[#E7E0D4] hover:border-[#D6CCBC]"
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: color.solid }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#241B2F] truncate">
                        {evt.name}
                      </p>
                      <p className={`${ibmPlexMono.className} text-[11px] text-[#5C5468] mt-0.5`}>
                        {new Date(evt.startDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}{" "}
                        –{" "}
                        {new Date(evt.endDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#5C5468]">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {evt.stopsCount} stops
                        </span>
                        <span className={`${ibmPlexMono.className} font-semibold text-[#2F7A6F]`}>
                          ${evt.totalExpense.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {events.length === 0 && !isCalLoading && (
          <div className="mt-8 bg-white rounded-xl border border-[#E7E0D4] p-12 text-center shadow-xs">
            <CalendarIcon className="w-12 h-12 text-[#9A93A6] mx-auto mb-3" />
            <h3 className={`${spaceGrotesk.className} text-[18px] font-bold text-[#241B2F]`}>
              No trips in {MONTH_NAMES[viewMonth]}
            </h3>
            <p className="text-[14px] text-[#5C5468] mt-1 mb-4">
              Navigate to a different month, or plan a new adventure!
            </p>
            <button
              onClick={() => router.push("/trips/new")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#714B67] hover:bg-[#4E3347] text-white rounded-lg text-[14px] font-semibold transition-colors cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              Plan a New Trip
            </button>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════
          TRIP DETAIL SIDE PANEL (Slide-over)
         ══════════════════════════════════════════════════ */}
      {selectedTrip && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#241B2F]/30 backdrop-blur-xs z-50 transition-opacity"
            onClick={() => setSelectedTripId(null)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-[#E7E0D4] shadow-xl z-50 overflow-y-auto animate-in slide-in-from-right-10">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-[#E7E0D4] px-6 py-4 flex items-center justify-between z-10">
              <h3 className={`${spaceGrotesk.className} text-[18px] font-bold text-[#241B2F]`}>
                Trip Details
              </h3>
              <button
                onClick={() => setSelectedTripId(null)}
                className="w-8 h-8 rounded-lg border border-[#E7E0D4] hover:bg-[#F1EDE6] flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4 text-[#5C5468]" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Cover Photo */}
              {selectedTrip.coverPhoto && (
                <div className="rounded-xl overflow-hidden border border-[#E7E0D4] h-44">
                  <img
                    src={selectedTrip.coverPhoto}
                    alt={selectedTrip.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Trip Name & Dates */}
              <div>
                <h2 className={`${spaceGrotesk.className} text-[22px] font-bold text-[#241B2F]`}>
                  {selectedTrip.name}
                </h2>
                {selectedTrip.description && (
                  <p className="text-[13px] text-[#5C5468] mt-1">{selectedTrip.description}</p>
                )}
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-3 p-4 bg-[#FAF8F5] rounded-lg border border-[#E7E0D4]">
                <CalendarIcon className="w-5 h-5 text-[#714B67] flex-shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-[#5C5468] uppercase">Travel Dates</p>
                  <p className={`${ibmPlexMono.className} text-[14px] font-semibold text-[#241B2F] mt-0.5`}>
                    {new Date(selectedTrip.startDate).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    →{" "}
                    {new Date(selectedTrip.endDate).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold ${
                    selectedTrip.status === "ongoing"
                      ? "bg-[#EBF7F5] text-[#2F7A6F]"
                      : selectedTrip.status === "upcoming"
                        ? "bg-[#FFF2ED] text-[#E0663D]"
                        : "bg-[#F1EDE6] text-[#5C5468]"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedTrip.status === "ongoing"
                        ? "bg-[#2F7A6F] animate-pulse"
                        : selectedTrip.status === "upcoming"
                          ? "bg-[#E0663D]"
                          : "bg-[#9A93A6]"
                    }`}
                  />
                  {selectedTrip.status.charAt(0).toUpperCase() + selectedTrip.status.slice(1)}
                </span>

                {selectedTrip.isPublic && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F1E7EE] text-[#714B67] text-[11px] font-semibold">
                    <Eye className="w-3 h-3" />
                    Public
                  </span>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-[#FAF8F5] border border-[#E7E0D4] text-center">
                  <p className="text-[10px] text-[#5C5468] uppercase font-semibold">Multi-City Stops</p>
                  <p className={`${ibmPlexMono.className} text-[20px] font-bold text-[#241B2F] mt-1`}>
                    {selectedTrip.stopsCount}
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-[#FAF8F5] border border-[#E7E0D4] text-center">
                  <p className="text-[10px] text-[#5C5468] uppercase font-semibold">Total Spend</p>
                  <p className={`${ibmPlexMono.className} text-[20px] font-bold text-[#2F7A6F] mt-1`}>
                    ${selectedTrip.totalExpense.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Cities Visited */}
              {selectedTrip.cities.length > 0 && (
                <div>
                  <h4 className="text-[13px] font-semibold text-[#5C5468] uppercase mb-3">
                    Cities in Itinerary
                  </h4>
                  <div className="space-y-2">
                    {selectedTrip.cities.map((city, idx) => (
                      <div
                        key={city.id + idx}
                        className="flex items-center gap-3 p-3 rounded-lg border border-[#E7E0D4] bg-white hover:bg-[#FAF8F5] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#F1E7EE] text-[#714B67] flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#241B2F]">{city.name}</p>
                          <p className="text-[11px] text-[#5C5468]">{city.country}</p>
                        </div>
                        <div className="text-right">
                          <p className={`${ibmPlexMono.className} text-[11px] text-[#5C5468]`}>
                            {new Date(city.startDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}{" "}
                            –{" "}
                            {new Date(city.endDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#E7E0D4]">
                <button
                  onClick={() => router.push(`/trips/${selectedTrip.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#714B67] hover:bg-[#4E3347] text-white text-[13px] font-semibold transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  View Full Itinerary
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
