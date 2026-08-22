"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";

import { AppNav } from "@/src/components/AppNav";
import { formatINR } from "@/src/libs/utils";

import { getTripById } from "@/src/libs/interaction/dataGetter";
import { apiClient } from "@/src/libs/interaction";
import { BASE_URL } from "@/src/libs/constants";
import { useToast } from "@/src/hooks/useToast";
import { DetailedTrip, Stop, StopActivity } from "@/src/libs/types";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"] });

/* ── Category Styles ── */
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  SIGHTSEEING: { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  ADVENTURE:   { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
  NIGHTLIFE:   { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE" },
  CULTURE:     { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" },
  FOOD:        { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" },
  RELAXATION:  { bg: "#F0FDFA", text: "#0D9488", border: "#99F6E4" },
  SHOPPING:    { bg: "#FEFCE8", text: "#CA8A04", border: "#FEF08A" },
  TRANSPORT:   { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" },
  OTHER:       { bg: "#FAF8F5", text: "#5C5468", border: "#E7E0D4" },
};

function formatDateDisplay(iso: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatDayHeader(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function getDaysArray(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(curr.getTime()) || isNaN(end.getTime())) return [];
  while (curr <= end) {
    dates.push(curr.toISOString().split("T")[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export default function TripItineraryViewPage() {
  const params = useParams();
  const tripId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"timeline" | "grouped">("timeline");
  const [showShareModal, setShowShareModal] = useState(false);

  /* ── Query Trip Data ── */
  const { data: tripRes, isLoading, isError } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => getTripById(tripId),
    retry: false,
  });

  const trip: DetailedTrip | null = tripRes?.data ?? null;

  /* ── Toggle Public Visibility Mutation ── */
  const { mutate: toggleVisibility, isPending: isTogglingVis } = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`${BASE_URL}/api/trips/${tripId}/visibility`);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      toast({
        title: res?.data?.isPublic ? "Trip is now Public! 🌐" : "Trip is now Private 🔒",
        description: res?.message || "Visibility updated.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err?.message, variant: "destructive" });
    },
  });

  const stops = useMemo(() => {
    if (!trip?.stops) return [];
    return [...trip.stops].sort((a, b) => a.order - b.order);
  }, [trip?.stops]);

  const totalCost = useMemo(() => {
    if (!trip) return 0;
    let cost = 0;
    stops.forEach((st) => {
      st.stopActivities?.forEach((sa) => {
        cost += sa.costOverride ?? sa.activity?.cost ?? 0;
      });
    });
    if (trip.expenses) {
      trip.expenses.forEach((e) => { cost += e.amount; });
    }
    return cost;
  }, [trip, stops]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <AppNav />
        <div className="max-w-[1120px] mx-auto px-6 py-12 flex flex-col gap-6">
          <div className="h-10 bg-[#F1EDE6] rounded-xl w-1/3 animate-pulse" />
          <div className="h-40 bg-[#F1EDE6] rounded-2xl animate-pulse" />
          <div className="h-64 bg-[#F1EDE6] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <AppNav />
        <div className="max-w-[600px] mx-auto px-6 py-20 text-center flex flex-col items-center gap-4">
          <span className="text-4xl">🗺️</span>
          <h1 className={`text-2xl font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
            Trip Not Found
          </h1>
          <p className="text-sm text-[#5C5468]">
            This trip might have been deleted or you don&apos;t have permission to view it.
          </p>
          <Link
            href="/trips"
            className="px-5 py-2.5 bg-[#714B67] text-white font-semibold text-sm rounded-xl hover:bg-[#4E3347] transition-all"
          >
            Back to My Trips
          </Link>
        </div>
      </div>
    );
  }

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/trips/${trip.id}`
    : `/trips/${trip.id}`;

  return (
    <div className={`min-h-screen bg-[#FAF8F5] text-[#241B2F] ${inter.className}`}>
      <AppNav />

      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        
        {/* ── Header Banner Card ── */}
        <div className="relative bg-white border border-[#E7E0D4] rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(36,27,47,0.04)]">
          {/* Cover Photo */}
          {trip.coverPhoto && (
            <div className="relative h-48 sm:h-64 w-full bg-[#F1EDE6]">
              <Image src={trip.coverPhoto} alt={trip.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#241B2F]/80 via-[#241B2F]/30 to-transparent" />
            </div>
          )}

          <div className="p-6 sm:p-8 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className={`text-2xl sm:text-3xl font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                    {trip.name}
                  </h1>
                  {trip.isPublic ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                      Public
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF8F5] text-[#5C5468] border border-[#E7E0D4]">
                      Private
                    </span>
                  )}
                </div>
                {trip.description && (
                  <p className="text-sm text-[#5C5468] mt-1 line-clamp-2 max-w-[700px]">
                    {trip.description}
                  </p>
                )}
              </div>

              {/* Action CTAs */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="px-4 py-2 bg-white border border-[#E7E0D4] text-[#241B2F] font-semibold text-xs rounded-xl hover:bg-[#F1EDE6] transition-all flex items-center gap-1.5"
                >
                  <span>🔗</span> Share
                </button>
                <button
                  type="button"
                  onClick={() => toggleVisibility()}
                  disabled={isTogglingVis}
                  className="px-4 py-2 bg-white border border-[#E7E0D4] text-[#5C5468] font-semibold text-xs rounded-xl hover:bg-[#F1EDE6] transition-all"
                >
                  {isTogglingVis ? "Updating..." : trip.isPublic ? "Make Private" : "Make Public"}
                </button>
                <Link
                  href={`/trips/${trip.id}/budget`}
                  className="px-4 py-2 bg-white border border-[#E7E0D4] text-[#714B67] font-bold text-xs rounded-xl hover:bg-[#F1E7EE] transition-all flex items-center gap-1.5"
                >
                  <span>💰</span> Budget & Costs
                </Link>
                <Link
                  href={`/trips/${trip.id}/builder`}
                  className="px-5 py-2 bg-[#714B67] text-white font-bold text-xs rounded-xl hover:bg-[#4E3347] transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>✏️</span> Edit Itinerary
                </Link>
              </div>
            </div>

            {/* Trip Specs Metadata Row */}
            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-[#F1EDE6] text-xs text-[#5C5468]">
              <div className="flex items-center gap-2">
                <span>🗓️</span>
                <span className={`font-semibold text-[#241B2F] ${ibmPlexMono.className}`}>
                  {formatDateDisplay(trip.startDate)} — {formatDateDisplay(trip.endDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>📍</span>
                <span className="font-semibold text-[#241B2F]">
                  {stops.length} {stops.length === 1 ? "Stop" : "Stops"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>💰</span>
                <span className={`font-bold text-[#714B67] ${ibmPlexMono.className}`}>
                  Est. Total ${totalCost}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── View Mode Toggle Bar (Timeline vs Grouped by City) ── */}
        <div className="flex items-center justify-between border-b border-[#E7E0D4] pb-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`pb-2 text-sm font-bold transition-all relative ${
                viewMode === "timeline"
                  ? "text-[#714B67] border-b-2 border-[#714B67]"
                  : "text-[#5C5468] hover:text-[#241B2F]"
              }`}
            >
              📅 Timeline View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`pb-2 text-sm font-bold transition-all relative ${
                viewMode === "grouped"
                  ? "text-[#714B67] border-b-2 border-[#714B67]"
                  : "text-[#5C5468] hover:text-[#241B2F]"
              }`}
            >
              🌆 Grouped by City
            </button>
          </div>

          <span className="text-xs text-[#9A93A6] hidden sm:inline">
            Read-only itinerary view
          </span>
        </div>

        {/* ── Route Line Section ── */}
        {stops.length > 0 && (
          <div className="bg-white border border-[#E7E0D4] rounded-2xl p-6 shadow-[0_4px_16px_rgba(36,27,47,0.04)]">
            <h3 className={`text-xs font-bold uppercase tracking-wider text-[#9A93A6] mb-4 ${spaceGrotesk.className}`}>
              Journey Route
            </h3>
            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
              {stops.map((stop, index) => (
                <div key={stop.id} className="flex items-center gap-4 flex-none">
                  <div className="flex items-center gap-3 bg-[#FAF8F5] border border-[#E7E0D4] px-4 py-2.5 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-[#714B67] text-white flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#241B2F]">{stop.city?.name}</p>
                      <p className={`text-[10px] text-[#5C5468] ${ibmPlexMono.className}`}>
                        {formatDateDisplay(stop.startDate)}
                      </p>
                    </div>
                  </div>
                  {index < stops.length - 1 && (
                    <div className="w-8 border-b-2 border-dashed border-[#E0663D]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TIMELINE MODE BODY ── */}
        {viewMode === "timeline" && (
          <div className="flex flex-col gap-8">
            {stops.length === 0 ? (
              <div className="bg-white border border-[#E7E0D4] rounded-2xl p-12 text-center flex flex-col items-center gap-3">
                <span className="text-3xl">🗺️</span>
                <p className={`text-base font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                  No stops added to itinerary yet
                </p>
                <Link
                  href={`/trips/${trip.id}/builder`}
                  className="px-4 py-2 bg-[#714B67] text-white text-xs font-semibold rounded-xl hover:bg-[#4E3347]"
                >
                  Add Cities in Itinerary Builder →
                </Link>
              </div>
            ) : (
              stops.map((stop) => {
                const days = getDaysArray(stop.startDate, stop.endDate);

                return (
                  <div key={stop.id} className="bg-white border border-[#E7E0D4] rounded-2xl p-6 shadow-[0_4px_16px_rgba(36,27,47,0.04)] flex flex-col gap-6">
                    {/* Stop Header */}
                    <div className="flex items-center justify-between border-b border-[#F1EDE6] pb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📍</span>
                        <div>
                          <h2 className={`text-xl font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                            {stop.city?.name}, {stop.city?.country}
                          </h2>
                          <p className={`text-xs text-[#5C5468] ${ibmPlexMono.className}`}>
                            {formatDateDisplay(stop.startDate)} — {formatDateDisplay(stop.endDate)}
                          </p>
                        </div>
                      </div>

                      <span className="px-3 py-1 bg-[#F1E7EE] text-[#714B67] text-xs font-bold rounded-lg">
                        {stop.stopActivities?.length || 0} Activities
                      </span>
                    </div>

                    {/* Day-by-Day Timeline Blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {days.map((dayDate, dayIdx) => {
                        const dayActs = (stop.stopActivities || []).filter(
                          (sa) => sa.scheduledDate?.split("T")[0] === dayDate
                        );

                        return (
                          <div key={dayDate} className="bg-[#FAF8F5] border border-[#E7E0D4] rounded-xl p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-[#E7E0D4] pb-2">
                              <span className={`text-xs font-bold text-[#714B67] uppercase tracking-wider ${ibmPlexMono.className}`}>
                                Day {dayIdx + 1} • {formatDayHeader(dayDate)}
                              </span>
                              <span className="text-[10px] text-[#9A93A6]">
                                {dayActs.length} {dayActs.length === 1 ? "item" : "items"}
                              </span>
                            </div>

                            {dayActs.length > 0 ? (
                              <div className="flex flex-col gap-2.5">
                                {dayActs.map((sa) => {
                                  const catStyle = CATEGORY_STYLES[sa.activity?.category || "OTHER"] || CATEGORY_STYLES.OTHER;
                                  const cost = sa.costOverride ?? sa.activity?.cost ?? 0;

                                  return (
                                    <div key={sa.id} className="bg-white border border-[#E7E0D4] rounded-lg p-3 flex items-center justify-between gap-3 shadow-2xs">
                                      <div className="flex items-center gap-3">
                                        {sa.startTime && (
                                          <span className={`text-xs font-semibold text-[#714B67] ${ibmPlexMono.className}`}>
                                            {sa.startTime}
                                          </span>
                                        )}
                                        <div>
                                          <p className="text-xs font-bold text-[#241B2F]">{sa.activity?.name}</p>
                                          <span
                                            className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase"
                                            style={{ backgroundColor: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}
                                          >
                                            {sa.activity?.category}
                                          </span>
                                        </div>
                                      </div>

                                      <span className={`text-xs font-bold text-[#241B2F] ${ibmPlexMono.className}`}>
                                        {cost === 0 ? "Free" : formatINR(cost)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-[#9A93A6] italic py-2">
                                No activities scheduled for this day
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── GROUPED BY CITY MODE BODY ── */}
        {viewMode === "grouped" && (
          <div className="flex flex-col gap-6">
            {stops.map((stop) => (
              <div key={stop.id} className="bg-white border border-[#E7E0D4] rounded-2xl p-6 shadow-[0_4px_16px_rgba(36,27,47,0.04)] flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#F1EDE6] pb-3">
                  <div>
                    <h3 className={`text-lg font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                      {stop.city?.name}, {stop.city?.country}
                    </h3>
                    <p className={`text-xs text-[#5C5468] ${ibmPlexMono.className}`}>
                      {formatDateDisplay(stop.startDate)} — {formatDateDisplay(stop.endDate)}
                    </p>
                  </div>
                </div>

                {stop.stopActivities && stop.stopActivities.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stop.stopActivities.map((sa) => {
                      const catStyle = CATEGORY_STYLES[sa.activity?.category || "OTHER"] || CATEGORY_STYLES.OTHER;
                      const cost = sa.costOverride ?? sa.activity?.cost ?? 0;

                      return (
                        <div key={sa.id} className="bg-[#FAF8F5] border border-[#E7E0D4] rounded-xl p-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🎯</span>
                            <div>
                              <p className="text-xs font-bold text-[#241B2F]">{sa.activity?.name}</p>
                              <span
                                className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase"
                                style={{ backgroundColor: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}
                              >
                                {sa.activity?.category}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className={`text-xs font-bold text-[#714B67] ${ibmPlexMono.className}`}>
                              {cost === 0 ? "Free" : formatINR(cost)}
                            </p>
                            {sa.startTime && (
                              <p className={`text-[10px] text-[#9A93A6] ${ibmPlexMono.className}`}>
                                ⏱ {sa.startTime}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#9A93A6] italic py-2">
                    No activities assigned to this city stop yet.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

      </main>

      {/* ── Share Modal ── */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E7E0D4] p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                Share Itinerary
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-[#9A93A6] hover:text-[#241B2F] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#5C5468]">
              Copy link to share this travel itinerary with friends or community.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-[#F1EDE6] border border-[#E7E0D4] rounded-xl px-3 py-2 text-xs text-[#241B2F] outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast({ title: "Link Copied! 📋", description: "Itinerary link copied to clipboard." });
                }}
                className="px-4 py-2 bg-[#714B67] text-white font-bold text-xs rounded-xl hover:bg-[#4E3347]"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
