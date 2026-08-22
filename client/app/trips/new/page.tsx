"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";

import { createTrip } from "@/src/libs/interaction/dataPoster";
import { useToast } from "@/src/hooks/useToast";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"] });

/* ── Category Color Map ── */
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Sightseeing: { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  Adventure: { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
  Nightlife: { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE" },
  Culture: { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" },
  Food: { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" },
  Relaxation: { bg: "#F0FDFA", text: "#0D9488", border: "#99F6E4" },
};

/* ── Curated Destinations ── */
const PRESET_PLACES = [
  { id: "paris", name: "Paris", country: "France", tag: "City of Light", image: "/dest_paris.png", costBadge: "€€€", costTier: "Mid-range", flag: "🇫🇷" },
  { id: "bali", name: "Bali", country: "Indonesia", tag: "Island of Gods", image: "/dest_bali.png", costBadge: "€€", costTier: "Budget", flag: "🇮🇩" },
  { id: "tokyo", name: "Tokyo", country: "Japan", tag: "Neon & Tradition", image: "/dest_tokyo.png", costBadge: "€€€", costTier: "Mid-range", flag: "🇯🇵" },
  { id: "santorini", name: "Santorini", country: "Greece", tag: "Aegean Gem", image: "/dest_santorini.png", costBadge: "€€€€", costTier: "Luxury", flag: "🇬🇷" },
  { id: "newyork", name: "New York", country: "USA", tag: "The Big Apple", image: "/dest_newyork.png", costBadge: "€€€€", costTier: "Luxury", flag: "🇺🇸" },
];

/* ── Activities Catalog ── */
const SUGGESTED_ACTIVITIES = [
  { id: "act-1", title: "Eiffel Tower Sunset & Seine Cruise", location: "Paris", country: "France", category: "Sightseeing", image: "/dest_paris.png", duration: "3 hrs", cost: "$45", rating: "4.9" },
  { id: "act-2", title: "Louvre Museum Highlights & Mona Lisa", location: "Paris", country: "France", category: "Culture", image: "/dest_paris.png", duration: "2.5 hrs", cost: "$38", rating: "4.8" },
  { id: "act-3", title: "Ubud Monkey Forest & Rice Terraces", location: "Bali", country: "Indonesia", category: "Adventure", image: "/dest_bali.png", duration: "Full day", cost: "$25", rating: "4.9" },
  { id: "act-4", title: "Street Food Night Market & Cooking", location: "Bali", country: "Indonesia", category: "Food", image: "/dest_bali.png", duration: "3.5 hrs", cost: "$18", rating: "4.7" },
  { id: "act-5", title: "Shibuya Crossing & Izakaya Crawl", location: "Tokyo", country: "Japan", category: "Nightlife", image: "/dest_tokyo.png", duration: "4 hrs", cost: "$60", rating: "4.9" },
  { id: "act-6", title: "Traditional Tea Ceremony & Asakusa", location: "Tokyo", country: "Japan", category: "Culture", image: "/dest_tokyo.png", duration: "2 hrs", cost: "$40", rating: "4.8" },
  { id: "act-7", title: "Oia Cliffside Wine Tasting Tour", location: "Santorini", country: "Greece", category: "Culture", image: "/dest_santorini.png", duration: "2.5 hrs", cost: "$85", rating: "4.9" },
  { id: "act-8", title: "Caldera Catamaran Sailing & Springs", location: "Santorini", country: "Greece", category: "Relaxation", image: "/dest_santorini.png", duration: "5 hrs", cost: "$120", rating: "5.0" },
  { id: "act-9", title: "Central Park Bike & Museum Tour", location: "New York", country: "USA", category: "Sightseeing", image: "/dest_newyork.png", duration: "3.5 hrs", cost: "$35", rating: "4.7" },
  { id: "act-10", title: "Broadway Show & Times Square Dining", location: "New York", country: "USA", category: "Nightlife", image: "/dest_newyork.png", duration: "4.5 hrs", cost: "$110", rating: "4.9" },
];

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
  const [selectedPlace, setSelectedPlace] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [coverSourceTab, setCoverSourceTab] = useState<"preset" | "url" | "upload">("preset");
  const [selectedCoverPreset, setSelectedCoverPreset] = useState(PRESET_PLACES[0].image);
  const [customCoverUrl, setCustomCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);

  /* ── Suggestions Filters ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>("All");

  const categories = ["All", "Sightseeing", "Culture", "Adventure", "Nightlife", "Food", "Relaxation"];

  /* ── Filtered Activities ── */
  const filteredActivities = useMemo(() => {
    return SUGGESTED_ACTIVITIES.filter((act) => {
      const matchCat = activeCategory === "All" || act.category === activeCategory;
      const matchCity = selectedCityFilter === "All" || act.location.toLowerCase() === selectedCityFilter.toLowerCase();
      const matchQuery =
        !searchQuery.trim() ||
        act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchCity && matchQuery;
    });
  }, [activeCategory, selectedCityFilter, searchQuery]);

  /* ── Computed Duration ── */
  const tripDuration = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : null;
  }, [startDate, endDate]);

  /* ── Quick Duration Setter ── */
  const handleQuickDuration = (days: number) => {
    const today = startDate ? new Date(startDate) : new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + (days - 1));

    if (!startDate) {
      setStartDate(today.toISOString().split("T")[0]);
    }
    setEndDate(end.toISOString().split("T")[0]);
  };

  /* ── Mutation ── */
  const { mutate: handleCreateTrip, isPending } = useMutation({
    mutationFn: async () => {
      let finalCover: string | File = selectedCoverPreset;
      if (coverSourceTab === "url" && customCoverUrl.trim()) finalCover = customCoverUrl.trim();
      else if (coverSourceTab === "upload" && coverFile) finalCover = coverFile;

      if (finalCover instanceof File) {
        const fd = new FormData();
        fd.append("name", tripName);
        fd.append("startDate", startDate);
        fd.append("endDate", endDate);
        if (description) fd.append("description", description);
        fd.append("isPublic", String(isPublic));
        fd.append("coverPhoto", finalCover);
        return await createTrip(fd);
      }
      return await createTrip({
        name: tripName,
        startDate,
        endDate,
        description: description || undefined,
        isPublic,
        coverPhoto: finalCover || undefined,
      });
    },
    onSuccess: (res) => {
      if (res?.success) {
        toast({
          title: "Trip Created! 🎉",
          description: `"${res.data.name}" has been created. Redirecting to itinerary builder...`,
          variant: "default",
        });
        router.push(`/trips/${res.data.id}/builder`);
      } else {
        toast({
          title: "Could not create trip",
          description: res?.message || "Something went wrong while creating your trip.",
          variant: "destructive",
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Network error",
        description: err?.message || "Failed to communicate with server.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName.trim()) {
      return toast({ title: "Trip name required", description: "Please provide a name for your journey.", variant: "destructive" });
    }
    if (!startDate || !endDate) {
      return toast({ title: "Dates required", description: "Please pick both start and end travel dates.", variant: "destructive" });
    }
    if (new Date(startDate) > new Date(endDate)) {
      return toast({ title: "Invalid date range", description: "Start date must be before end date.", variant: "destructive" });
    }
    handleCreateTrip();
  };

  /* ── Pick Destination Preset ── */
  const handleSelectPresetCity = (place: typeof PRESET_PLACES[0]) => {
    setSelectedPlace(`${place.name}, ${place.country}`);
    setSelectedCoverPreset(place.image);
    setCoverSourceTab("preset");
    setSelectedCityFilter(place.name);

    if (!tripName || tripName.startsWith("Trip to")) {
      setTripName(`Trip to ${place.name}`);
    }
    toast({ title: `${place.flag} ${place.name} selected`, description: `Destination set to ${place.name}, ${place.country}.` });
  };

  /* ── Pick Activity Suggestion ── */
  const handlePickActivity = (act: typeof SUGGESTED_ACTIVITIES[0]) => {
    const label = `${act.location}, ${act.country}`;
    setSelectedPlace(label);
    setSelectedCityFilter(act.location);

    if (!tripName || tripName.startsWith("Trip to")) {
      setTripName(`Trip to ${act.location}`);
    }
    const matchPreset = PRESET_PLACES.find((p) => p.name === act.location);
    if (matchPreset) {
      setSelectedCoverPreset(matchPreset.image);
      setCoverSourceTab("preset");
    }
    toast({ title: `📍 ${act.location} selected`, description: `Updated primary destination from "${act.title}".` });
  };

  return (
    <div className={`min-h-screen bg-[#FAF8F5] text-[#241B2F] ${inter.className}`}>

      {/* ── Top Header Bar ── */}
      <header className="w-full border-b border-[#E7E0D4] bg-white/95 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-[0_2px_8px_rgba(36,27,47,0.03)]">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-[13px] font-semibold text-[#714B67] hover:text-[#4E3347] transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#F1E7EE]"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Dashboard
          </Link>
          <span className="text-[#D6CCBC] text-lg font-light">/</span>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌐</span>
            <span className={`font-bold text-[#714B67] tracking-tight text-[18px] ${spaceGrotesk.className}`}>
              GlobeTrotter
            </span>
          </div>
        </div>

        {/* Step Indicator & Tag */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[12px] bg-[#F1EDE6] px-3 py-1 rounded-full border border-[#E7E0D4]">
            <span className="w-4 h-4 rounded-full bg-[#714B67] text-white flex items-center justify-center text-[9px] font-bold">1</span>
            <span className="font-semibold text-[#241B2F]">Basic Details</span>
            <span className="text-[#9A93A6]">→</span>
            <span className="w-4 h-4 rounded-full bg-white text-[#9A93A6] flex items-center justify-center text-[9px] font-bold border border-[#D6CCBC]">2</span>
            <span className="text-[#9A93A6]">Itinerary Builder</span>
          </div>
          <span className={`px-3 py-1 text-[11px] rounded-full bg-[#F1E7EE] text-[#714B67] font-bold tracking-wider ${ibmPlexMono.className}`}>
            NEW TRIP
          </span>
        </div>
      </header>

      {/* ── Main Two-Column Container ── */}
      <main className="max-w-[1340px] mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ════════════════════════════════════════════════════════════
              LEFT COLUMN: Form & Live Boarding-Pass Preview (Sticky)
             ════════════════════════════════════════════════════════════ */}
          <aside className="w-full lg:w-[460px] xl:w-[500px] flex-none lg:sticky lg:top-[74px] flex flex-col gap-4">


            {/* Form Card Container */}
            <div className="bg-white border border-[#E7E0D4] rounded-2xl shadow-[0_4px_16px_rgba(36,27,47,0.04)] overflow-hidden">

              <div className="px-6 pt-5 pb-2">
                <h1 className={`text-[22px] font-bold text-[#241B2F] tracking-tight ${spaceGrotesk.className}`}>
                  Trip Details
                </h1>
              </div>

              <form onSubmit={onSubmit} className="px-6 pb-6 pt-3 flex flex-col gap-4">

                {/* Trip Name Input */}
                <div>
                  <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                    Trip Name <span className="text-[#C0392B]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Summer in Kyoto & Osaka, Eurotrip 2026"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    required
                    className={inputBaseCls}
                  />
                </div>

                {/* Primary Destination with Quick Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider">
                      Primary Destination
                    </label>
                    <span className="text-[11px] text-[#9A93A6]">or pick from right →</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Paris, Bali, Tokyo, Santorini..."
                    value={selectedPlace}
                    onChange={(e) => setSelectedPlace(e.target.value)}
                    className={inputBaseCls}
                  />
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

                {/* Trip Description */}
                <div>
                  <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                    Description <span className="text-[#9A93A6] normal-case font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Exploring ancient temples, food alleys, and coastal walks..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`${inputBaseCls} resize-none`}
                  />
                </div>

                {/* Cover Photo Tab Selector */}
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
                        className={`flex-1 text-[11.5px] font-semibold py-1.5 rounded-lg transition-all capitalize ${coverSourceTab === tab
                            ? "bg-[#714B67] text-white shadow-sm"
                            : "bg-[#F1EDE6] text-[#5C5468] hover:bg-[#E7E0D4]"
                          }`}
                      >
                        {tab === "preset" ? "🖼 Preset" : tab === "url" ? "🔗 URL" : "📤 Upload"}
                      </button>
                    ))}
                  </div>

                  {/* Preset Thumbnails */}
                  {coverSourceTab === "preset" && (
                    <div className="grid grid-cols-5 gap-2">
                      {PRESET_PLACES.map((place) => {
                        const selected = selectedCoverPreset === place.image;
                        return (
                          <button
                            key={place.id}
                            type="button"
                            onClick={() => setSelectedCoverPreset(place.image)}
                            className={`relative h-14 rounded-xl overflow-hidden border-2 transition-all ${selected
                                ? "border-[#714B67] ring-2 ring-[#F1E7EE] scale-105 shadow-sm"
                                : "border-transparent opacity-70 hover:opacity-100"
                              }`}
                          >
                            <Image src={place.image} alt={place.name} fill className="object-cover" />
                            <span className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[8px] font-bold py-0.5 text-center truncate px-0.5">
                              {place.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Custom URL */}
                  {coverSourceTab === "url" && (
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={customCoverUrl}
                      onChange={(e) => setCustomCoverUrl(e.target.value)}
                      className={inputBaseCls}
                    />
                  )}

                  {/* Drag & Drop File */}
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
                        {coverFile ? coverFile.name : "Choose or drag image here"}
                      </span>
                      <span className="text-[10px] text-[#9A93A6]">PNG, JPG, WEBP up to 5MB</span>
                    </label>
                  )}
                </div>

                {/* Public / Community Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-[#FAF8F5] border border-[#E7E0D4] rounded-xl">
                  <div>
                    <p className="text-[13px] font-semibold text-[#241B2F]">Make Trip Public</p>
                    <p className="text-[11px] text-[#5C5468]">Allow other travelers to view & copy your route</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-none p-0.5 ${isPublic ? "bg-[#714B67]" : "bg-[#D6CCBC]"
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isPublic ? "translate-x-5" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={isPending}
                  className={`w-full mt-1 py-3.5 rounded-xl font-bold text-[14px] text-white transition-all duration-150 flex items-center justify-center gap-2.5 shadow-sm
                    ${isPending
                      ? "bg-[#9A93A6] cursor-not-allowed"
                      : "bg-[#714B67] hover:bg-[#4E3347] hover:shadow-[0_6px_20px_rgba(113,75,103,0.3)] active:scale-[0.99] cursor-pointer"
                    }`}
                >
                  {isPending ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Creating Trip...
                    </>
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
              RIGHT COLUMN: Suggestions & Discover Feed
             ════════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">


            {/* Activities Suggestions Grid */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className={`text-[15px] font-bold text-[#241B2F] uppercase tracking-wider flex items-center gap-1.5 ${spaceGrotesk.className}`}>
                  Suggested Experiences & Activities
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredActivities.map((act) => {
                  const catStyle = CATEGORY_COLORS[act.category] ?? { bg: "#F1EDE6", text: "#5C5468", border: "#E7E0D4" };
                  const isSelected = selectedPlace.startsWith(act.location);

                  return (
                    <div
                      key={act.id}
                      onClick={() => handlePickActivity(act)}
                      className={`group relative bg-white border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-[0_8px_24px_rgba(36,27,47,0.08)] hover:-translate-y-0.5 ${isSelected
                          ? "border-[#714B67] shadow-[0_0_0_2px_#F1E7EE,0_4px_16px_rgba(113,75,103,0.12)]"
                          : "border-[#E7E0D4]"
                        }`}
                    >
                      {/* Image Header */}
                      <div className="relative h-44 w-full overflow-hidden bg-[#F1EDE6]">
                        <Image
                          src={act.image}
                          alt={act.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#241B2F]/60 via-transparent to-transparent" />

                        {/* Category Badge */}
                        <span
                          className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm"
                          style={{
                            backgroundColor: catStyle.bg,
                            color: catStyle.text,
                            border: `1px solid ${catStyle.border}`,
                          }}
                        >
                          {act.category}
                        </span>

                        {/* Cost & Rating */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <span className={`bg-white/95 text-[#714B67] text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-sm ${ibmPlexMono.className}`}>
                            {act.cost}
                          </span>
                        </div>

                        {/* Selected Check Indicator */}
                        {isSelected && (
                          <div className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-[#714B67] flex items-center justify-center shadow-md">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex flex-col gap-2.5">
                        <h4 className={`text-[15px] font-bold text-[#241B2F] line-clamp-1 group-hover:text-[#714B67] transition-colors ${spaceGrotesk.className}`}>
                          {act.title}
                        </h4>

                        <div className="flex items-center justify-between text-[12px] text-[#5C5468]">
                          <span className="flex items-center gap-1">
                            📍 {act.location}, {act.country}
                          </span>
                          <span className={`text-[11px] text-[#9A93A6] font-medium ${ibmPlexMono.className}`}>
                            ⏱ {act.duration}
                          </span>
                        </div>

                        <button
                          type="button"
                          className={`mt-1 w-full py-2 rounded-xl text-[12px] font-bold transition-all ${isSelected
                              ? "bg-[#714B67] text-white shadow-sm"
                              : "bg-[#F1EDE6] text-[#241B2F] group-hover:bg-[#714B67] group-hover:text-white"
                            }`}
                        >
                          {isSelected ? "✓ Destination Set" : "Select Destination →"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty state */}
              {filteredActivities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#E7E0D4] rounded-2xl p-6 text-center gap-2">
                  <span className="text-3xl">🗺️</span>
                  <p className={`text-[15px] font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                    No matching suggestions found
                  </p>
                  <p className="text-[13px] text-[#5C5468]">
                    Try clearing search or picking another category filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveCategory("All");
                      setSelectedCityFilter("All");
                    }}
                    className="mt-2 px-4 py-1.5 bg-[#714B67] text-white text-[12px] font-semibold rounded-lg hover:bg-[#4E3347] transition-colors"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
