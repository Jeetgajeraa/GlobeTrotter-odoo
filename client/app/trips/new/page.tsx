"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";

import { AppNav } from "@/src/components/AppNav";
import { getCities, getActivities } from "@/src/libs/interaction/dataGetter";
import { formatINR } from "@/src/libs/utils";

import { createTrip, addStop, addStopActivity } from "@/src/libs/interaction/dataPoster";
import { useToast } from "@/src/hooks/useToast";
import { City, Activity, ActivityCategory } from "@/src/libs/types";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"] });

/* ── Category Color Map ── */
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
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

/* Helper parsers for backend responses */
function extractCities(resData: any): City[] {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.cities)) return resData.cities;
  return [];
}

function extractActivities(resData: any): (Activity & { city?: { id: string; name: string; country: string } })[] {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.activities)) return resData.activities;
  return [];
}

function formatDuration(min: number): string {
  if (!min) return "1 hr";
  if (min < 60) return `${min} mins`;
  const hrs = (min / 60).toFixed(min % 60 === 0 ? 0 : 1);
  return `${hrs} ${hrs === "1" ? "hr" : "hrs"}`;
}

const inputBaseCls =
  "w-full bg-[#F1EDE6] border border-transparent rounded-xl px-4 py-2.5 text-[13.5px] " +
  "text-[#241B2F] outline-none transition-all duration-150 " +
  "hover:border-[#D6CCBC] focus:border-[#714B67] focus:shadow-[0_0_0_3px_#F1E7EE] " +
  "focus:bg-white placeholder:text-[#9A93A6]";

export default function CreateTripPage() {
  const router = useRouter();
  const { toast } = useToast();

  /* ── Form States ── */
  const [tripName, setTripName] = useState("");
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [placeSearchInput, setPlaceSearchInput] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [coverSourceTab, setCoverSourceTab] = useState<"preset" | "url" | "upload">("preset");
  const [selectedCoverPreset, setSelectedCoverPreset] = useState<string>("/dest_paris.png");
  const [customCoverUrl, setCustomCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);

  /* Selected Activities to pre-add */
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);

  /* ── Filter States for Experiences ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const categories = [
    { label: "All", value: "ALL" },
    { label: "Sightseeing", value: "SIGHTSEEING" },
    { label: "Culture", value: "CULTURE" },
    { label: "Adventure", value: "ADVENTURE" },
    { label: "Food", value: "FOOD" },
    { label: "Nightlife", value: "NIGHTLIFE" },
    { label: "Relaxation", value: "RELAXATION" },
  ];

  /* ── Backend Queries ── */
  // 1. Fetch cities for selection & suggestions
  const { data: citiesRes, isLoading: isCitiesLoading } = useQuery({
    queryKey: ["cities", placeSearchInput],
    queryFn: () => getCities(placeSearchInput.trim() || undefined),
    staleTime: 1000 * 60 * 5,
  });

  const citiesList = useMemo(() => extractCities(citiesRes?.data), [citiesRes]);

  // 2. Fetch activities from database
  const { data: activitiesRes, isLoading: isActivitiesLoading } = useQuery({
    queryKey: ["activities", searchQuery, activeCategory, selectedCity?.id],
    queryFn: () =>
      getActivities({
        search: searchQuery.trim() || undefined,
        category: activeCategory !== "ALL" ? activeCategory : undefined,
        cityId: selectedCity?.id,
      }),
    staleTime: 1000 * 60 * 5,
  });

  const activitiesList = useMemo(() => extractActivities(activitiesRes?.data), [activitiesRes]);

  /* ── Duration calculation ── */
  const tripDuration = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : null;
  }, [startDate, endDate]);

  /* ── Mutation to create trip + optional initial stop & activities ── */
  const { mutate: handleCreateTrip, isPending } = useMutation({
    mutationFn: async () => {
      let finalCover: string | File = selectedCoverPreset;
      if (coverSourceTab === "url" && customCoverUrl.trim()) finalCover = customCoverUrl.trim();
      else if (coverSourceTab === "upload" && coverFile) finalCover = coverFile;

      let createRes;
      if (finalCover instanceof File) {
        const fd = new FormData();
        fd.append("name", tripName);
        fd.append("startDate", startDate);
        fd.append("endDate", endDate);
        if (description) fd.append("description", description);
        fd.append("isPublic", String(isPublic));
        fd.append("coverPhoto", finalCover);
        createRes = await createTrip(fd);
      } else {
        createRes = await createTrip({
          name: tripName,
          startDate,
          endDate,
          description: description || undefined,
          isPublic,
          coverPhoto: finalCover || undefined,
        });
      }

      if (!createRes?.success || !createRes.data?.id) {
        throw new Error(createRes?.message || "Failed to create trip.");
      }

      const tripId = createRes.data.id;

      // Add initial stop if a city was selected
      if (selectedCity?.id) {
        const stopRes = await addStop(tripId, {
          cityId: selectedCity.id,
          startDate,
          endDate,
        });

        // Add selected activities if stop was created
        if (stopRes?.success && stopRes.data?.id && selectedActivityIds.length > 0) {
          const stopId = stopRes.data.id;
          for (let i = 0; i < selectedActivityIds.length; i++) {
            await addStopActivity(stopId, {
              activityId: selectedActivityIds[i],
              scheduledDate: startDate,
              order: i + 1,
            });
          }
        }
      }

      return createRes.data;
    },
    onSuccess: (tripData) => {
      toast({
        title: "Trip Created! 🎉",
        description: `"${tripData.name}" has been created. Redirecting to itinerary builder...`,
      });
      router.push(`/trips/${tripData.id}/builder`);
    },
    onError: (err: any) => {
      toast({
        title: "Could not create trip",
        description: err?.message || "Something went wrong while creating your trip.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName.trim()) {
      return toast({ title: "Trip name required", description: "Please enter a name for your trip.", variant: "destructive" });
    }
    if (!startDate || !endDate) {
      return toast({ title: "Dates required", description: "Please pick start and end travel dates.", variant: "destructive" });
    }
    if (new Date(startDate) > new Date(endDate)) {
      return toast({ title: "Invalid date range", description: "Start date cannot be after end date.", variant: "destructive" });
    }
    handleCreateTrip();
  };

  /* Select city handler */
  const handleSelectCity = (city: City) => {
    setSelectedCity(city);
    setPlaceSearchInput(`${city.name}, ${city.country}`);
    setShowCityDropdown(false);

    if (city.imageUrl) {
      setSelectedCoverPreset(city.imageUrl);
      setCoverSourceTab("preset");
    }

    if (!tripName || tripName.startsWith("Trip to")) {
      setTripName(`Trip to ${city.name}`);
    }

    toast({
      title: `📍 ${city.name} selected`,
      description: `Primary destination set to ${city.name}, ${city.country}.`,
    });
  };

  /* Toggle activity selection */
  const handleToggleActivity = (act: Activity & { city?: { id: string; name: string; country: string } }) => {
    setSelectedActivityIds((prev) => {
      const exists = prev.includes(act.id);
      if (exists) {
        return prev.filter((id) => id !== act.id);
      } else {
        // If no city is selected yet, automatically select this activity's city
        if (!selectedCity && act.cityId) {
          const match = citiesList.find((c) => c.id === act.cityId);
          if (match) handleSelectCity(match);
        }
        return [...prev, act.id];
      }
    });
  };

  return (
    <div className={`min-h-screen bg-[#FAF8F5] text-[#241B2F] ${inter.className}`}>
      <AppNav />

      {/* ── Secondary Header / Sub-nav ── */}
      <div className="w-full bg-white border-b border-[#E7E0D4] px-6 py-3">
        <div className="max-w-[1340px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/trips"
              className="text-[13px] font-semibold text-[#714B67] hover:text-[#4E3347] transition-colors flex items-center gap-1.5 px-3 py-1 rounded-lg hover:bg-[#F1E7EE]"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to My Trips
            </Link>
            <span className="text-[#D6CCBC]">/</span>
            <span className={`font-semibold text-[#241B2F] text-[15px] ${spaceGrotesk.className}`}>
              Plan a new trip
            </span>
          </div>

          <div className="flex items-center gap-2 text-[12px] bg-[#F1EDE6] px-3 py-1 rounded-full border border-[#E7E0D4]">
            <span className="w-4 h-4 rounded-full bg-[#714B67] text-white flex items-center justify-center text-[9px] font-bold">1</span>
            <span className="font-semibold text-[#241B2F]">Basic Details</span>
            <span className="text-[#9A93A6]">→</span>
            <span className="w-4 h-4 rounded-full bg-white text-[#9A93A6] flex items-center justify-center text-[9px] font-bold border border-[#D6CCBC]">2</span>
            <span className="text-[#9A93A6]">Itinerary Builder</span>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <main className="max-w-[1340px] mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ════════════════════════════════════════════════════════════
              LEFT COLUMN: Trip Creation Form (Screen 4 Layout)
             ════════════════════════════════════════════════════════════ */}
          <aside className="w-full lg:w-[460px] xl:w-[500px] flex-none flex flex-col gap-4">
            <div className="bg-white border border-[#E7E0D4] rounded-2xl shadow-[0_4px_16px_rgba(36,27,47,0.04)] overflow-hidden">
              
              <div className="px-6 pt-5 pb-2 border-b border-[#F1EDE6]">
                <h1 className={`text-[22px] font-bold text-[#241B2F] tracking-tight ${spaceGrotesk.className}`}>
                  Plan a new trip
                </h1>
                <p className="text-[12px] text-[#5C5468] mt-0.5">
                  Set your dates and primary destination to start building your itinerary.
                </p>
              </div>

              <form onSubmit={onSubmit} className="px-6 pb-6 pt-4 flex flex-col gap-4">

                {/* Trip Name Input */}
                <div>
                  <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                    Trip Name <span className="text-[#C0392B]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Summer in Tokyo, Mumbai Getaway, Eurotrip"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    required
                    className={inputBaseCls}
                  />
                </div>

                {/* City Search / Primary Destination Input */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider">
                      Select a Place / City
                    </label>
                    {selectedCity && (
                      <button
                        type="button"
                        onClick={() => { setSelectedCity(null); setPlaceSearchInput(""); }}
                        className="text-[11px] text-[#714B67] hover:underline"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search city (e.g. Mumbai, Jaipur, Paris, Tokyo)..."
                      value={placeSearchInput}
                      onChange={(e) => {
                        setPlaceSearchInput(e.target.value);
                        setShowCityDropdown(true);
                      }}
                      onFocus={() => setShowCityDropdown(true)}
                      className={inputBaseCls}
                    />
                    {isCitiesLoading && (
                      <div className="absolute right-3 top-2.5 text-[12px] text-[#9A93A6]">
                        Searching...
                      </div>
                    )}
                  </div>

                  {/* City Autocomplete Dropdown */}
                  {showCityDropdown && citiesList.length > 0 && (
                    <div className="absolute left-0 right-0 top-[100%] mt-1 bg-white border border-[#E7E0D4] rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto">
                      {citiesList.map((city) => (
                        <div
                          key={city.id}
                          onClick={() => handleSelectCity(city)}
                          className="px-4 py-2.5 hover:bg-[#F1E7EE] cursor-pointer flex items-center justify-between transition-colors border-b border-[#FAF8F5] last:border-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">📍</span>
                            <div>
                              <p className="text-[13px] font-bold text-[#241B2F]">{city.name}</p>
                              <p className="text-[11px] text-[#5C5468]">{city.country} {city.region ? `• ${city.region}` : ""}</p>
                            </div>
                          </div>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${ibmPlexMono.className} bg-[#F1EDE6] text-[#714B67]`}>
                            ★ {city.popularity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date Pickers */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                      Start Date <span className="text-[#C0392B]">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className={`${inputBaseCls} ${ibmPlexMono.className}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                      End Date <span className="text-[#C0392B]">*</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className={`${inputBaseCls} ${ibmPlexMono.className}`}
                    />
                  </div>
                </div>

                {tripDuration && (
                  <div className="text-[11.5px] font-medium text-[#714B67] bg-[#F1E7EE] px-3 py-1.5 rounded-lg flex items-center justify-between">
                    <span>⏱ Calculated Duration:</span>
                    <span className={`font-bold ${ibmPlexMono.className}`}>{tripDuration} Days</span>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                    Description <span className="text-[#9A93A6] normal-case font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Sightseeing historic monuments, food tours, and relaxing walks..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`${inputBaseCls} resize-none`}
                  />
                </div>

                {/* Cover Photo Selection */}
                <div>
                  <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-2">
                    Cover Photo
                  </label>
                  <div className="flex gap-1.5 mb-2.5">
                    {(["preset", "url", "upload"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setCoverSourceTab(tab)}
                        className={`flex-1 text-[11.5px] font-semibold py-1.5 rounded-lg transition-all capitalize ${
                          coverSourceTab === tab
                            ? "bg-[#714B67] text-white shadow-sm"
                            : "bg-[#F1EDE6] text-[#5C5468] hover:bg-[#E7E0D4]"
                        }`}
                      >
                        {tab === "preset" ? "🖼 Photo" : tab === "url" ? "🔗 URL" : "📤 Upload"}
                      </button>
                    ))}
                  </div>

                  {/* City Preset Thumbnails */}
                  {coverSourceTab === "preset" && (
                    <div className="grid grid-cols-4 gap-2">
                      {citiesList.slice(0, 4).map((city) => {
                        const img = city.imageUrl || "/dest_paris.png";
                        const selected = selectedCoverPreset === img;
                        return (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() => setSelectedCoverPreset(img)}
                            className={`relative h-14 rounded-xl overflow-hidden border-2 transition-all ${
                              selected
                                ? "border-[#714B67] ring-2 ring-[#F1E7EE] scale-105 shadow-sm"
                                : "border-transparent opacity-70 hover:opacity-100"
                            }`}
                          >
                            <Image src={img} alt={city.name} fill className="object-cover" unoptimized />
                            <span className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[8px] font-bold py-0.5 text-center truncate px-0.5">
                              {city.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {coverSourceTab === "url" && (
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={customCoverUrl}
                      onChange={(e) => setCustomCoverUrl(e.target.value)}
                      className={inputBaseCls}
                    />
                  )}

                  {coverSourceTab === "upload" && (
                    <label className="flex flex-col items-center gap-1.5 p-3.5 bg-[#F1EDE6] border-2 border-dashed border-[#D6CCBC] rounded-xl cursor-pointer hover:border-[#714B67] hover:bg-[#F1E7EE] transition-all group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <span className="text-xl group-hover:scale-110 transition-transform">📸</span>
                      <span className="text-[12px] font-medium text-[#241B2F] text-center truncate max-w-[200px]">
                        {coverFile ? coverFile.name : "Choose image file"}
                      </span>
                    </label>
                  )}
                </div>

                {/* Public Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-[#FAF8F5] border border-[#E7E0D4] rounded-xl">
                  <div>
                    <p className="text-[13px] font-semibold text-[#241B2F]">Make Trip Public</p>
                    <p className="text-[11px] text-[#5C5468]">Allow other travelers to view & copy your itinerary</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-none p-0.5 ${
                      isPublic ? "bg-[#714B67]" : "bg-[#D6CCBC]"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        isPublic ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={isPending}
                  className={`w-full mt-1 py-3.5 rounded-xl font-bold text-[14px] text-white transition-all duration-150 flex items-center justify-center gap-2.5 shadow-sm ${
                    isPending
                      ? "bg-[#9A93A6] cursor-not-allowed"
                      : "bg-[#714B67] hover:bg-[#4E3347] hover:shadow-[0_6px_20px_rgba(113,75,103,0.3)] active:scale-[0.99] cursor-pointer"
                  }`}
                >
                  {isPending ? (
                    <span>Creating Trip...</span>
                  ) : (
                    <>
                      <span>Save & Build Itinerary</span>
                      <span className="text-base">→</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </aside>

          {/* ════════════════════════════════════════════════════════════
              RIGHT COLUMN: Suggestion for Places to Visit / Activities (Screen 4 Layout)
             ════════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            
            <div className="bg-white border border-[#E7E0D4] rounded-2xl p-5 shadow-[0_4px_16px_rgba(36,27,47,0.04)] flex flex-col gap-4">
              <div>
                <h2 className={`text-[18px] font-bold text-[#241B2F] tracking-tight ${spaceGrotesk.className}`}>
                  Suggestion for Places to Visit / Activities to perform
                </h2>
                <p className="text-[12px] text-[#5C5468] mt-0.5">
                  Browse activities from the database and tap to select experiences for your journey.
                </p>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-t border-[#F1EDE6] pt-4">
                {/* Search Input */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search experiences, activities, monuments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#F1EDE6] border border-transparent rounded-xl pl-9 pr-4 py-2 text-[12.5px] text-[#241B2F] outline-none focus:border-[#714B67] focus:bg-white"
                  />
                  <span className="absolute left-3 top-2.5 text-sm text-[#9A93A6]">🔍</span>
                </div>

                {/* Selected Count Indicator */}
                {selectedActivityIds.length > 0 && (
                  <div className="text-[12px] font-bold text-[#714B67] bg-[#F1E7EE] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <span>✓ {selectedActivityIds.length} Selected</span>
                    <button
                      type="button"
                      onClick={() => setSelectedActivityIds([])}
                      className="text-[10px] text-[#9A93A6] hover:text-[#241B2F] underline ml-1"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Category Chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setActiveCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold whitespace-nowrap transition-all ${
                      activeCategory === cat.value
                        ? "bg-[#714B67] text-white shadow-sm"
                        : "bg-[#F1EDE6] text-[#5C5468] hover:bg-[#E7E0D4]"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Activities Grid */}
            {isActivitiesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 bg-[#F1EDE6] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : activitiesList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activitiesList.map((act) => {
                  const isSelected = selectedActivityIds.includes(act.id);
                  const catStyle = CATEGORY_COLORS[act.category] || CATEGORY_COLORS.OTHER;
                  const img = act.imageUrl || "/dest_paris.png";

                  return (
                    <div
                      key={act.id}
                      onClick={() => handleToggleActivity(act)}
                      className={`group relative bg-white border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between ${
                        isSelected
                          ? "border-[#714B67] ring-2 ring-[#714B67] shadow-md"
                          : "border-[#E7E0D4]"
                      }`}
                    >
                      {/* Image Header */}
                      <div className="relative h-40 w-full overflow-hidden bg-[#F1EDE6]">
                        <Image
                          src={img}
                          alt={act.name}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#241B2F]/60 via-transparent to-transparent" />

                        {/* Category Tag */}
                        <span
                          className="absolute top-2.5 left-2.5 text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm"
                          style={{
                            backgroundColor: catStyle.bg,
                            color: catStyle.text,
                            border: `1px solid ${catStyle.border}`,
                          }}
                        >
                          {act.category}
                        </span>

                        {/* Cost Tag */}
                        <span className={`absolute top-2.5 right-2.5 bg-white/90 text-[#714B67] text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-sm ${ibmPlexMono.className}`}>
                          {act.cost === 0 ? "Free" : formatINR(act.cost)}
                        </span>

                        {/* Selection Checkmark */}
                        {isSelected && (
                          <div className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-[#714B67] text-white flex items-center justify-center font-bold text-sm shadow-md">
                            ✓
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3.5 flex flex-col gap-2 flex-1 justify-between">
                        <div>
                          <h3 className={`text-[14px] font-bold text-[#241B2F] line-clamp-1 group-hover:text-[#714B67] transition-colors ${spaceGrotesk.className}`}>
                            {act.name}
                          </h3>
                          {act.description && (
                            <p className="text-[11.5px] text-[#5C5468] line-clamp-2 mt-1 leading-snug">
                              {act.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#9A93A6] border-t border-[#FAF8F5] pt-2 mt-1">
                          <span className="truncate">
                            📍 {act.city?.name || "City"}
                          </span>
                          <span className={`font-medium ${ibmPlexMono.className}`}>
                            ⏱ {formatDuration(act.durationMin)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-[#E7E0D4] rounded-2xl p-12 text-center flex flex-col items-center gap-3">
                <span className="text-3xl">🏛️</span>
                <p className={`text-[16px] font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                  No activities found
                </p>
                <p className="text-[13px] text-[#5C5468]">
                  Try adjusting your search query or selecting a different category filter.
                </p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
