"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";

import { getTripById, getCities, getActivities } from "@/src/libs/interaction/dataGetter";
import { addStop, addStopActivity } from "@/src/libs/interaction/dataPoster";
import { updateStop, reorderStops } from "@/src/libs/interaction/dataPatcher";
import { deleteStop, deleteStopActivity } from "@/src/libs/interaction/dataDeleter";
import { useToast } from "@/src/hooks/useToast";
import {
  DetailedTrip,
  Stop,
  StopActivity,
  City,
  Activity,
  ActivityCategory,
} from "@/src/libs/types";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"] });

/* ── Category Styling ── */
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

/* ── Fallback Preset Data for instant seed / offline preview ── */
const FALLBACK_CITIES: City[] = [
  { id: "c-paris",     name: "Paris",     country: "France",    costIndex: 3, popularity: 98, imageUrl: "/dest_paris.png" },
  { id: "c-bali",      name: "Bali",      country: "Indonesia", costIndex: 1.8, popularity: 95, imageUrl: "/dest_bali.png" },
  { id: "c-tokyo",     name: "Tokyo",     country: "Japan",     costIndex: 3.2, popularity: 99, imageUrl: "/dest_tokyo.png" },
  { id: "c-santorini", name: "Santorini", country: "Greece",    costIndex: 4, popularity: 92, imageUrl: "/dest_santorini.png" },
  { id: "c-newyork",   name: "New York",  country: "USA",       costIndex: 4.2, popularity: 96, imageUrl: "/dest_newyork.png" },
];

const FALLBACK_ACTIVITIES: Activity[] = [
  { id: "a-1", cityId: "c-tokyo", name: "Shibuya Crossing & Izakaya Tour", category: "NIGHTLIFE", cost: 60, durationMin: 180, imageUrl: "/dest_tokyo.png", description: "Experience Tokyo's most iconic intersection followed by food alleys." },
  { id: "a-2", cityId: "c-tokyo", name: "Senso-ji Temple & Asakusa Walk", category: "CULTURE", cost: 35, durationMin: 120, imageUrl: "/dest_tokyo.png", description: "Explore Tokyo's oldest temple and traditional street shops." },
  { id: "a-3", cityId: "c-tokyo", name: "TeamLab Planets Digital Art Museum", category: "SIGHTSEEING", cost: 40, durationMin: 150, imageUrl: "/dest_tokyo.png", description: "Immerse in world-famous interactive light and mirror installations." },
  { id: "a-4", cityId: "c-paris", name: "Eiffel Tower Sunset & Champagne", category: "SIGHTSEEING", cost: 55, durationMin: 120, imageUrl: "/dest_paris.png", description: "Breathtaking views over Paris during golden hour." },
  { id: "a-5", cityId: "c-paris", name: "Louvre Museum Guided Tour", category: "CULTURE", cost: 45, durationMin: 180, imageUrl: "/dest_paris.png", description: "See the Mona Lisa, Venus de Milo, and French masterpieces." },
  { id: "a-6", cityId: "c-bali",  name: "Ubud Monkey Forest & Rice Terraces", category: "ADVENTURE", cost: 30, durationMin: 240, imageUrl: "/dest_bali.png", description: "Walk through lush rainforests and UNESCO world heritage rice fields." },
];

/* ── Date Helpers ── */
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

function formatDateDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatDayHeader(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function ItineraryBuilderPage() {
  const params = useParams();
  const tripId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* ── UI States ── */
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [isAddStopModalOpen, setIsAddStopModalOpen] = useState(false);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [selectedDayForActivity, setSelectedDayForActivity] = useState<string>("");
  const [deleteConfirmStopId, setDeleteConfirmStopId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>("Just now");

  /* ── Query: Trip Details ── */
  const { data: tripData, isLoading, isError, refetch } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const res = await getTripById(tripId);
      if (res?.success && res.data) return res.data;
      // Fallback Trip object for demo/offline resilience
      return {
        id: tripId,
        name: "My Grand Journey",
        description: "A wonderful multi-city exploration.",
        coverPhoto: "/dest_paris.png",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 86400000 * 9).toISOString().split("T")[0],
        isPublic: false,
        createdAt: new Date().toISOString(),
        stops: [
          {
            id: "stop-sample-1",
            tripId,
            cityId: "c-paris",
            startDate: new Date().toISOString().split("T")[0],
            endDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
            order: 1,
            city: FALLBACK_CITIES[0],
            stopActivities: [
              {
                id: "sa-1",
                stopId: "stop-sample-1",
                activityId: "a-4",
                scheduledDate: new Date().toISOString().split("T")[0],
                startTime: "16:30",
                order: 1,
                costOverride: 55,
                activity: FALLBACK_ACTIVITIES[3],
              },
            ],
          },
        ],
        expenses: [],
      } as DetailedTrip;
    },
  });

  const trip = tripData;
  const stops = useMemo(() => {
    if (!trip?.stops) return [];
    return [...trip.stops].sort((a, b) => a.order - b.order);
  }, [trip?.stops]);

  // Set default selected stop if not set
  useEffect(() => {
    if (stops.length > 0 && (!selectedStopId || !stops.some((s) => s.id === selectedStopId))) {
      setSelectedStopId(stops[0].id);
    }
  }, [stops, selectedStopId]);

  const activeStop = useMemo(() => {
    return stops.find((s) => s.id === selectedStopId) || stops[0] || null;
  }, [stops, selectedStopId]);

  /* ── Query: Available Cities & Activities ── */
  const { data: citiesData } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const res = await getCities();
      if (res?.success && res.data && res.data.length > 0) return res.data;
      return FALLBACK_CITIES;
    },
  });
  const availableCities = citiesData || FALLBACK_CITIES;

  const { data: activitiesData } = useQuery({
    queryKey: ["activities", activeStop?.cityId],
    queryFn: async () => {
      const res = await getActivities({ cityId: activeStop?.cityId });
      if (res?.success && res.data && res.data.length > 0) return res.data;
      return FALLBACK_ACTIVITIES;
    },
  });
  const availableActivities = activitiesData || FALLBACK_ACTIVITIES;

  /* ── Computed Overall Trip Metrics ── */
  const totalDays = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return 0;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }, [trip?.startDate, trip?.endDate]);

  const totalCalculatedBudget = useMemo(() => {
    let total = 0;
    stops.forEach((st) => {
      st.stopActivities?.forEach((sa) => {
        const cost = sa.costOverride ?? sa.activity?.cost ?? 0;
        total += Number(cost);
      });
    });
    return total;
  }, [stops]);

  /* ── Add Stop Form State ── */
  const [newStopCityId, setNewStopCityId] = useState("");
  const [newStopStartDate, setNewStopStartDate] = useState("");
  const [newStopEndDate, setNewStopEndDate] = useState("");

  const handleOpenAddStop = () => {
    setNewStopCityId(availableCities[0]?.id || "");
    const lastStop = stops[stops.length - 1];
    if (lastStop) {
      const nextDate = new Date(lastStop.endDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const afterDate = new Date(nextDate);
      afterDate.setDate(afterDate.getDate() + 2);
      setNewStopStartDate(nextDate.toISOString().split("T")[0]);
      setNewStopEndDate(afterDate.toISOString().split("T")[0]);
    } else if (trip?.startDate) {
      setNewStopStartDate(trip.startDate.split("T")[0]);
      setNewStopEndDate(trip.endDate ? trip.endDate.split("T")[0] : trip.startDate.split("T")[0]);
    }
    setIsAddStopModalOpen(true);
  };

  /* ── Mutation: Add Stop ── */
  const { mutate: handleAddStop, isPending: isAddingStop } = useMutation({
    mutationFn: async () => {
      if (!newStopCityId || !newStopStartDate || !newStopEndDate) {
        throw new Error("Please select city and date range.");
      }
      return await addStop(tripId, {
        cityId: newStopCityId,
        startDate: newStopStartDate,
        endDate: newStopEndDate,
        order: stops.length + 1,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      setIsAddStopModalOpen(false);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      if (res?.data?.id) setSelectedStopId(res.data.id);
      toast({ title: "Stop Added! 📍", description: "New destination added to your itinerary route." });
    },
    onError: (err: any) => {
      toast({ title: "Error adding stop", description: err?.message || "Failed to add stop.", variant: "destructive" });
    },
  });

  /* ── Mutation: Delete Stop ── */
  const { mutate: handleDeleteStop, isPending: isDeletingStop } = useMutation({
    mutationFn: async (stopId: string) => {
      return await deleteStop(stopId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      setDeleteConfirmStopId(null);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast({ title: "Stop Removed", description: "The stop was removed from your route." });
    },
    onError: (err: any) => {
      toast({ title: "Error deleting stop", description: err?.message || "Failed to delete stop.", variant: "destructive" });
    },
  });

  /* ── Mutation: Reorder Stops (Up / Down) ── */
  const handleMoveStop = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;

    const newStops = [...stops];
    const temp = newStops[index];
    newStops[index] = newStops[targetIndex];
    newStops[targetIndex] = temp;

    const payload = newStops.map((s, i) => ({ stopId: s.id, order: i + 1 }));
    try {
      await reorderStops(tripId, payload);
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast({ title: "Route Updated", description: "Stops reordered successfully." });
    } catch {
      toast({ title: "Reorder Failed", description: "Could not update route order.", variant: "destructive" });
    }
  };

  /* ── Add Activity Form State ── */
  const [activityMode, setActivityMode] = useState<"catalog" | "custom">("catalog");
  const [pickedActivityId, setPickedActivityId] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customCategory, setCustomCategory] = useState<ActivityCategory>("SIGHTSEEING");
  const [customCost, setCustomCost] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState<number>(120);
  const [activityTime, setActivityTime] = useState("10:00");

  const handleOpenAddActivity = (dayDate: string) => {
    setSelectedDayForActivity(dayDate);
    setPickedActivityId(availableActivities[0]?.id || "");
    setCustomTitle("");
    setActivityTime("10:00");
    setIsAddActivityModalOpen(true);
  };

  /* ── Mutation: Add Stop Activity ── */
  const { mutate: handleAddActivity, isPending: isAddingActivity } = useMutation({
    mutationFn: async () => {
      if (!activeStop) throw new Error("No active stop selected.");
      if (activityMode === "catalog") {
        return await addStopActivity(activeStop.id, {
          activityId: pickedActivityId,
          scheduledDate: selectedDayForActivity,
          startTime: activityTime,
        });
      } else {
        if (!customTitle.trim()) throw new Error("Please enter an activity name.");
        return await addStopActivity(activeStop.id, {
          customName: customTitle,
          category: customCategory,
          cost: Number(customCost) || 0,
          durationMin: Number(customDuration) || 60,
          scheduledDate: selectedDayForActivity,
          startTime: activityTime,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      setIsAddActivityModalOpen(false);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast({ title: "Activity Added! ✨", description: "Scheduled into your day plan." });
    },
    onError: (err: any) => {
      toast({ title: "Error adding activity", description: err?.message || "Failed to schedule activity.", variant: "destructive" });
    },
  });

  /* ── Mutation: Delete Activity ── */
  const handleDeleteActivity = async (stopActivityId: string) => {
    try {
      await deleteStopActivity(stopActivityId);
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast({ title: "Activity Removed", description: "Removed from day plan." });
    } catch {
      toast({ title: "Error", description: "Failed to delete activity.", variant: "destructive" });
    }
  };

  /* ── Days of the Active Stop ── */
  const activeStopDays = useMemo(() => {
    if (!activeStop?.startDate || !activeStop?.endDate) return [];
    return getDaysArray(activeStop.startDate, activeStop.endDate);
  }, [activeStop?.startDate, activeStop?.endDate]);

  /* ── Loading Skeleton ── */
  if (isLoading) {
    return (
      <div className={`min-h-screen bg-[#FAF8F5] p-8 flex flex-col gap-6 ${inter.className}`}>
        <div className="h-12 w-full bg-white rounded-xl animate-pulse border border-[#E7E0D4]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          <div className="lg:col-span-4 h-96 bg-white rounded-2xl animate-pulse border border-[#E7E0D4]" />
          <div className="lg:col-span-8 h-96 bg-white rounded-2xl animate-pulse border border-[#E7E0D4]" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#FAF8F5] text-[#241B2F] flex flex-col ${inter.className}`}>

      {/* ════════════════════════════════════════════════════════════
          1. TOP APP BAR / HEADER
         ════════════════════════════════════════════════════════════ */}
      <header className="w-full border-b border-[#E7E0D4] bg-white/95 backdrop-blur-md sticky top-0 z-40 px-5 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_2px_10px_rgba(36,27,47,0.03)]">
        
        {/* Left: Back & Trip Info */}
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="text-[13px] font-semibold text-[#714B67] hover:text-[#4E3347] transition-colors flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[#F1E7EE]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Dashboard
          </Link>

          <span className="text-[#D6CCBC] text-base font-light">/</span>

          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-[18px] sm:text-[20px] font-bold text-[#241B2F] tracking-tight truncate max-w-[240px] sm:max-w-[400px] ${spaceGrotesk.className}`}>
                {trip?.name || "Trip Planner"}
              </h1>
              <span className={`px-2 py-0.5 text-[10px] rounded-md font-bold uppercase bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] ${ibmPlexMono.className}`}>
                ITINERARY BUILDER
              </span>
            </div>
            <p className="text-[12px] text-[#5C5468] flex items-center gap-2 mt-0.5">
              <span>🗓 {trip?.startDate ? formatDateDisplay(trip.startDate) : "TBD"} – {trip?.endDate ? formatDateDisplay(trip.endDate) : "TBD"}</span>
              <span>•</span>
              <span className={ibmPlexMono.className}>{stops.length} {stops.length === 1 ? "stop" : "stops"} · {totalDays} days</span>
            </p>
          </div>
        </div>

        {/* Right: Metrics & Actions */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Estimated Budget Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E7E0D4]">
            <span className="text-[12px] text-[#5C5468] font-medium">Est. Activities:</span>
            <span className={`text-[13px] font-bold text-[#714B67] ${ibmPlexMono.className}`}>
              ${totalCalculatedBudget}
            </span>
          </div>

          {/* Autosave Pill */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#5C5468] px-2.5 py-1 rounded-lg bg-[#F1EDE6]">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
            <span className={ibmPlexMono.className}>Saved {lastSavedTime}</span>
          </div>

          {/* Action: Preview */}
          <button
            type="button"
            onClick={() => toast({ title: "Itinerary Preview", description: "You are previewing your live itinerary builder draft." })}
            className="px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold bg-[#714B67] hover:bg-[#4E3347] text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>Preview Trip</span>
            <span className="text-xs">👁️</span>
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════
          2. MAIN TWO-PANE WORKSPACE
         ════════════════════════════════════════════════════════════ */}
      <main className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col lg:flex-row gap-6 items-start">

        {/* ──────────────────────────────────────────────────────────
            LEFT PANE: Route Line & Stops Navigator (~340px)
           ────────────────────────────────────────────────────────── */}
        <aside className="w-full lg:w-[340px] xl:w-[360px] flex-none bg-white border border-[#E7E0D4] rounded-2xl shadow-[0_4px_20px_rgba(36,27,47,0.04)] p-5 lg:sticky lg:top-[76px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D4] mb-4">
            <div>
              <h2 className={`text-[16px] font-bold text-[#241B2F] uppercase tracking-wider ${spaceGrotesk.className}`}>
                Route & Stops
              </h2>
              <p className="text-[12px] text-[#5C5468]">Chronological travel segments</p>
            </div>
            <span className={`px-2 py-0.5 text-[11px] rounded bg-[#F1EDE6] text-[#714B67] font-bold ${ibmPlexMono.className}`}>
              {stops.length} STOPS
            </span>
          </div>

          {/* Stops Vertical Timeline */}
          {stops.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-2">
              <span className="text-3xl">📍</span>
              <p className="text-[14px] font-semibold text-[#241B2F]">No stops in this trip yet</p>
              <p className="text-[12px] text-[#5C5468]">Click below to add your first destination.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 relative before:absolute before:top-4 before:bottom-4 before:left-5 before:w-0.5 before:bg-gradient-to-b before:from-[#E0663D] before:via-[#714B67] before:to-[#2F7A6F]">
              {stops.map((stop, idx) => {
                const isSelected = stop.id === selectedStopId;
                const stopDaysCount = getDaysArray(stop.startDate, stop.endDate).length;
                const actCount = stop.stopActivities?.length || 0;

                return (
                  <div
                    key={stop.id}
                    onClick={() => setSelectedStopId(stop.id)}
                    className={`relative pl-10 pr-3.5 py-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "bg-[#FAF8F5] border-[#714B67] shadow-[0_2px_12px_rgba(113,75,103,0.12)] ring-1 ring-[#714B67]"
                        : "bg-white border-[#E7E0D4] hover:border-[#D6CCBC] hover:bg-[#FAF8F5]/60"
                    }`}
                  >
                    {/* Route Line Marker Node */}
                    <div
                      className={`absolute left-3 top-4 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-[#714B67] border-white ring-2 ring-[#714B67]"
                          : "bg-white border-[#E0663D]"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    {/* Stop Header & Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold text-[#E0663D] ${ibmPlexMono.className}`}>
                            0{idx + 1}
                          </span>
                          <h3 className={`text-[15px] font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                            {stop.city?.name || "City"}, {stop.city?.country || ""}
                          </h3>
                        </div>
                        <p className="text-[12px] text-[#5C5468] mt-0.5">
                          {formatDateDisplay(stop.startDate)} – {formatDateDisplay(stop.endDate)}
                          <span className={`ml-1.5 font-medium text-[#714B67] ${ibmPlexMono.className}`}>
                            ({stopDaysCount} {stopDaysCount === 1 ? "day" : "days"})
                          </span>
                        </p>
                        <p className="text-[11px] text-[#9A93A6] mt-0.5">
                          🎯 {actCount} {actCount === 1 ? "activity" : "activities"} scheduled
                        </p>
                      </div>

                      {/* Reorder / Delete Controls */}
                      <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveStop(idx, "up")}
                            title="Move stop earlier"
                            className="w-5 h-5 rounded hover:bg-[#F1EDE6] text-[#5C5468] disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-[10px]"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === stops.length - 1}
                            onClick={() => handleMoveStop(idx, "down")}
                            title="Move stop later"
                            className="w-5 h-5 rounded hover:bg-[#F1EDE6] text-[#5C5468] disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-[10px]"
                          >
                            ▼
                          </button>
                        </div>

                        {deleteConfirmStopId === stop.id ? (
                          <div className="flex items-center gap-1 bg-[#FFF1F2] border border-[#FECDD3] px-1.5 py-0.5 rounded">
                            <span className="text-[9px] text-[#BE123C] font-bold">Delete?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteStop(stop.id)}
                              className="text-[10px] text-[#BE123C] font-bold underline"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmStopId(null)}
                              className="text-[10px] text-[#5C5468]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmStopId(stop.id)}
                            title="Remove Stop"
                            className="text-[12px] text-[#9A93A6] hover:text-[#C0392B] transition-colors p-0.5"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* + Add Stop CTA Button */}
          <button
            type="button"
            onClick={handleOpenAddStop}
            className="w-full mt-4 py-2.5 rounded-xl border-2 border-dashed border-[#714B67]/30 hover:border-[#714B67] bg-[#F1E7EE]/30 hover:bg-[#F1E7EE] text-[#714B67] text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="text-base font-normal">+</span> Add Another Stop
          </button>
        </aside>

        {/* ──────────────────────────────────────────────────────────
            RIGHT PANE: Selected Stop Day-Wise Planner
           ────────────────────────────────────────────────────────── */}
        <section className="flex-1 min-w-0 w-full flex flex-col gap-6">

          {activeStop ? (
            <>
              {/* Stop Hero Header Card */}
              <div className="relative rounded-2xl overflow-hidden border border-[#E7E0D4] bg-white shadow-[0_4px_20px_rgba(36,27,47,0.04)]">
                <div className="relative h-44 w-full bg-[#241B2F]">
                  <Image
                    src={activeStop.city?.imageUrl || "/dest_paris.png"}
                    alt={activeStop.city?.name || "City"}
                    fill
                    className="object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#241B2F]/90 via-[#241B2F]/40 to-transparent" />

                  <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <span className={`text-[#EFA928] text-[11px] font-bold tracking-wider uppercase ${ibmPlexMono.className}`}>
                        STOP {stops.findIndex((s) => s.id === activeStop.id) + 1} OF {stops.length}
                      </span>
                      <h2 className={`text-2xl sm:text-3xl font-bold text-white tracking-tight ${spaceGrotesk.className}`}>
                        {activeStop.city?.name}, {activeStop.city?.country}
                      </h2>
                      <p className="text-[13px] text-white/80 mt-0.5">
                        🗓 {formatDateDisplay(activeStop.startDate)} – {formatDateDisplay(activeStop.endDate)} ({activeStopDays.length} Days)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-lg bg-white/20 backdrop-blur-md text-white text-[12px] font-bold border border-white/30 ${ibmPlexMono.className}`}>
                        {activeStop.stopActivities?.length || 0} Activities Planned
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Day-by-Day List */}
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h3 className={`text-[18px] font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                      Day-by-Day Schedule
                    </h3>
                    <p className="text-[13px] text-[#5C5468]">
                      Organize your activities and pacing across each calendar day.
                    </p>
                  </div>
                </div>

                {activeStopDays.map((dayDate, dayIdx) => {
                  const dayActivities = (activeStop.stopActivities || []).filter((sa) => {
                    const saDate = sa.scheduledDate ? sa.scheduledDate.split("T")[0] : "";
                    return saDate === dayDate;
                  });

                  return (
                    <div
                      key={dayDate}
                      className="bg-white border border-[#E7E0D4] rounded-2xl p-5 shadow-[0_2px_12px_rgba(36,27,47,0.03)] flex flex-col gap-4"
                    >
                      {/* Day Header Row */}
                      <div className="flex items-center justify-between border-b border-[#E7E0D4] pb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-lg bg-[#714B67] text-white text-[12px] font-bold ${ibmPlexMono.className}`}>
                            DAY 0{dayIdx + 1}
                          </span>
                          <div>
                            <h4 className={`text-[15px] font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                              {formatDayHeader(dayDate)}
                            </h4>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenAddActivity(dayDate)}
                          className="px-3 py-1.5 rounded-xl bg-[#F1E7EE] hover:bg-[#714B67] text-[#714B67] hover:text-white text-[12px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>+</span> Add Activity
                        </button>
                      </div>

                      {/* Day Activities List */}
                      {dayActivities.length === 0 ? (
                        <div className="py-6 px-4 border border-dashed border-[#D6CCBC] rounded-xl bg-[#FAF8F5] text-center flex flex-col items-center gap-1.5">
                          <span className="text-xl">☕</span>
                          <p className="text-[13px] font-semibold text-[#5C5468]">No activities planned for this day</p>
                          <p className="text-[11px] text-[#9A93A6]">Enjoy free time or click "+ Add Activity" to schedule sightseeing, dining, or experiences.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {dayActivities.map((sa) => {
                            const act = sa.activity;
                            const catStyle = CATEGORY_STYLES[act?.category || "OTHER"] || CATEGORY_STYLES.OTHER;
                            const cost = sa.costOverride ?? act?.cost ?? 0;

                            return (
                              <div
                                key={sa.id}
                                className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-[#E7E0D4] bg-[#FAF8F5]/50 hover:bg-white hover:shadow-sm hover:border-[#714B67]/30 transition-all"
                              >
                                <div className="flex items-start gap-3">
                                  {/* Time badge */}
                                  <div className={`px-2.5 py-1 rounded-lg bg-[#F1EDE6] text-[#241B2F] text-[11px] font-bold flex-none ${ibmPlexMono.className}`}>
                                    {sa.startTime || "Anytime"}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className={`text-[14px] font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                                        {act?.name || "Custom Activity"}
                                      </h5>
                                      <span
                                        className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                                        style={{ backgroundColor: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}
                                      >
                                        {act?.category || "OTHER"}
                                      </span>
                                    </div>

                                    {act?.description && (
                                      <p className="text-[12px] text-[#5C5468] mt-0.5 line-clamp-1">
                                        {act.description}
                                      </p>
                                    )}

                                    <div className="flex items-center gap-3 text-[11px] text-[#9A93A6] mt-1 font-medium">
                                      {act?.durationMin && (
                                        <span className={ibmPlexMono.className}>⏱ {Math.floor(act.durationMin / 60)}h {act.durationMin % 60 ? `${act.durationMin % 60}m` : ""}</span>
                                      )}
                                      <span className={`font-bold text-[#714B67] ${ibmPlexMono.className}`}>
                                        ${cost}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteActivity(sa.id)}
                                  title="Remove activity"
                                  className="text-[#9A93A6] hover:text-[#C0392B] p-1.5 rounded-lg hover:bg-[#FFF1F2] transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="bg-white border border-[#E7E0D4] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
              <span className="text-4xl">🗺️</span>
              <h3 className={`text-xl font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                Build Your Multi-City Itinerary
              </h3>
              <p className="text-[14px] text-[#5C5468] max-w-md">
                Add destinations to your journey to start planning day-wise activities, routes, and budgets.
              </p>
              <button
                type="button"
                onClick={handleOpenAddStop}
                className="mt-2 px-5 py-2.5 bg-[#714B67] hover:bg-[#4E3347] text-white font-bold text-[13.5px] rounded-xl transition-all shadow-sm"
              >
                + Add First Stop
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ════════════════════════════════════════════════════════════
          3. ADD STOP MODAL
         ════════════════════════════════════════════════════════════ */}
      {isAddStopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E7E0D4] rounded-2xl w-full max-w-[480px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-1.5 bg-gradient-to-r from-[#714B67] via-[#E0663D] to-[#2F7A6F]" />

            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-[18px] font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                  Add Destination Stop
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddStopModalOpen(false)}
                  className="text-[#9A93A6] hover:text-[#241B2F] p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* City Selection */}
              <div>
                <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                  Select Destination City
                </label>
                <select
                  value={newStopCityId}
                  onChange={(e) => setNewStopCityId(e.target.value)}
                  className="w-full bg-[#F1EDE6] border border-transparent rounded-xl px-4 py-2.5 text-[14px] text-[#241B2F] outline-none hover:border-[#D6CCBC] focus:border-[#714B67] focus:bg-white"
                >
                  {availableCities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}, {city.country}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newStopStartDate}
                    onChange={(e) => setNewStopStartDate(e.target.value)}
                    className={`w-full bg-[#F1EDE6] border border-transparent rounded-xl px-3 py-2 text-[13px] text-[#241B2F] outline-none hover:border-[#D6CCBC] focus:border-[#714B67] focus:bg-white ${ibmPlexMono.className}`}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newStopEndDate}
                    onChange={(e) => setNewStopEndDate(e.target.value)}
                    className={`w-full bg-[#F1EDE6] border border-transparent rounded-xl px-3 py-2 text-[13px] text-[#241B2F] outline-none hover:border-[#D6CCBC] focus:border-[#714B67] focus:bg-white ${ibmPlexMono.className}`}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStopModalOpen(false)}
                  className="px-4 py-2 text-[13px] font-semibold text-[#5C5468] hover:bg-[#F1EDE6] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isAddingStop}
                  onClick={() => handleAddStop()}
                  className="px-5 py-2 text-[13px] font-bold bg-[#714B67] hover:bg-[#4E3347] text-white rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {isAddingStop ? "Adding Stop..." : "Add to Itinerary"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          4. ADD ACTIVITY MODAL
         ════════════════════════════════════════════════════════════ */}
      {isAddActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E7E0D4] rounded-2xl w-full max-w-[520px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-1.5 bg-gradient-to-r from-[#714B67] via-[#E0663D] to-[#2F7A6F]" />

            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-[18px] font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                    Schedule Activity
                  </h3>
                  <p className="text-[12px] text-[#5C5468]">
                    Planning for: {formatDayHeader(selectedDayForActivity)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddActivityModalOpen(false)}
                  className="text-[#9A93A6] hover:text-[#241B2F] p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Mode Tabs */}
              <div className="flex gap-2 border-b border-[#E7E0D4] pb-2">
                <button
                  type="button"
                  onClick={() => setActivityMode("catalog")}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${
                    activityMode === "catalog" ? "bg-[#714B67] text-white" : "bg-[#F1EDE6] text-[#5C5468]"
                  }`}
                >
                  Explore City Catalog
                </button>
                <button
                  type="button"
                  onClick={() => setActivityMode("custom")}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${
                    activityMode === "custom" ? "bg-[#714B67] text-white" : "bg-[#F1EDE6] text-[#5C5468]"
                  }`}
                >
                  Custom Activity
                </button>
              </div>

              {activityMode === "catalog" ? (
                <div>
                  <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                    Select from Curated Experiences
                  </label>
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {availableActivities.map((act) => {
                      const isPicked = pickedActivityId === act.id;
                      return (
                        <div
                          key={act.id}
                          onClick={() => setPickedActivityId(act.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isPicked ? "bg-[#F1E7EE] border-[#714B67]" : "bg-[#FAF8F5] border-[#E7E0D4] hover:border-[#D6CCBC]"
                          }`}
                        >
                          <div>
                            <p className="text-[13px] font-bold text-[#241B2F]">{act.name}</p>
                            <p className="text-[11px] text-[#5C5468] mt-0.5">{act.category} · ⏱ {act.durationMin} mins</p>
                          </div>
                          <span className={`text-[12px] font-bold text-[#714B67] ${ibmPlexMono.className}`}>
                            ${act.cost}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1">
                      Activity Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Traditional Cooking Class, Rooftop Sunset Drinks"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full bg-[#F1EDE6] rounded-xl px-3 py-2 text-[13px] text-[#241B2F] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#241B2F] uppercase mb-1">Category</label>
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value as ActivityCategory)}
                        className="w-full bg-[#F1EDE6] rounded-xl px-2 py-1.5 text-[12px] outline-none"
                      >
                        <option value="SIGHTSEEING">Sightseeing</option>
                        <option value="FOOD">Food</option>
                        <option value="CULTURE">Culture</option>
                        <option value="ADVENTURE">Adventure</option>
                        <option value="NIGHTLIFE">Nightlife</option>
                        <option value="RELAXATION">Relaxation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#241B2F] uppercase mb-1">Cost ($)</label>
                      <input
                        type="number"
                        value={customCost}
                        onChange={(e) => setCustomCost(Number(e.target.value))}
                        className={`w-full bg-[#F1EDE6] rounded-xl px-2.5 py-1.5 text-[12px] outline-none ${ibmPlexMono.className}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#241B2F] uppercase mb-1">Duration (min)</label>
                      <input
                        type="number"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(Number(e.target.value))}
                        className={`w-full bg-[#F1EDE6] rounded-xl px-2.5 py-1.5 text-[12px] outline-none ${ibmPlexMono.className}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Time */}
              <div>
                <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={activityTime}
                  onChange={(e) => setActivityTime(e.target.value)}
                  className={`w-full bg-[#F1EDE6] rounded-xl px-3 py-2 text-[13px] text-[#241B2F] outline-none ${ibmPlexMono.className}`}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddActivityModalOpen(false)}
                  className="px-4 py-2 text-[13px] font-semibold text-[#5C5468] hover:bg-[#F1EDE6] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isAddingActivity}
                  onClick={() => handleAddActivity()}
                  className="px-5 py-2 text-[13px] font-bold bg-[#714B67] hover:bg-[#4E3347] text-white rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {isAddingActivity ? "Adding..." : "Schedule Activity"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
