"use client";
import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import { AppNav } from "@/src/components/AppNav";
import { getTripBudgetSummary, getTripById } from "@/src/libs/interaction/dataGetter";
import { addTripExpense } from "@/src/libs/interaction/dataPoster";
import { deleteTripExpense } from "@/src/libs/interaction/dataDeleter";
import { useToast } from "@/src/hooks/useToast";
import { TripBudgetSummaryData, AddExpensePayload } from "@/src/libs/types";
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600", "700"] });
/* ── Category Color Map ── */
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  TRANSPORT:  { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1", bar: "#64748B" },
  STAY:       { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA", bar: "#F97316" },
  ACTIVITIES: { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE", bar: "#3B82F6" },
  ACTIVITY:   { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE", bar: "#3B82F6" },
  MEALS:      { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3", bar: "#F43F5E" },
  OTHER:      { bg: "#FAF8F5", text: "#5C5468", border: "#E7E0D4", bar: "#714B67" },
};
function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
export default function TripBudgetPage() {
  const params = useParams();
  const tripId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  /* ── Filter / Search States ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [selectedCityFilter, setSelectedCityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"date" | "costDesc" | "costAsc">("date");
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  /* ── Add Expense Form States ── */
  const [expCategory, setExpCategory] = useState<string>("MEALS");
  const [expAmount, setExpAmount] = useState<number>(25);
  const [expDate, setExpDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [expDescription, setExpDescription] = useState<string>("");
  const [expStopId, setExpStopId] = useState<string>("");
  /* ── Query Budget Analytics ── */
  const { data: budgetRes, isLoading: isBudgetLoading, isError } = useQuery({
    queryKey: ["tripBudget", tripId],
    queryFn: () => getTripBudgetSummary(tripId),
    retry: false,
  });
  /* ── Query Full Trip Details (for stop IDs & dates) ── */
  const { data: tripRes } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => getTripById(tripId),
    retry: false,
  });
  const budget: TripBudgetSummaryData | null = budgetRes?.data ?? null;
  const trip = tripRes?.data ?? null;
  /* ── Mutation: Add Expense ── */
  const { mutate: handleAddExpense, isPending: isAddingExp } = useMutation({
    mutationFn: async (payload: AddExpensePayload) => {
      return await addTripExpense(tripId, payload);
    },
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["tripBudget", tripId] });
        queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
        setShowAddExpenseModal(false);
        setExpDescription("");
        toast({ title: "Expense Added! 💰", description: "Updated trip budget and cost breakdown." });
      } else {
        toast({ title: "Could not add expense", description: res?.message || "Failed to log expense.", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to communicate with server.", variant: "destructive" });
    },
  });
  /* ── Mutation: Delete Expense ── */
  const { mutate: handleDeleteExpense } = useMutation({
    mutationFn: (expenseId: string) => deleteTripExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tripBudget", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      toast({ title: "Expense Removed", description: "Expense item deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Delete error", description: err?.message, variant: "destructive" });
    },
  });
  const onAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || expAmount <= 0) {
      return toast({ title: "Invalid amount", description: "Please enter a positive expense amount.", variant: "destructive" });
    }
    if (!expDate) {
      return toast({ title: "Date required", description: "Please select expense date.", variant: "destructive" });
    }
    handleAddExpense({
      category: expCategory,
      amount: Number(expAmount),
      date: expDate,
      description: expDescription || undefined,
      stopId: expStopId || undefined,
    });
  };
  /* ── Derived Grand Total Cost & Status ── */
  const grandTotalCost = useMemo(() => {
    if (!budget) return 0;
    return budget.totalLoggedExpense + budget.totalEstimatedActivitiesCost;
  }, [budget]);
  const budgetStatus = useMemo(() => {
    if (!budget) return { label: "On Budget", color: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]" };
    const avg = budget.averageCostPerDay;
    if (avg > 300) return { label: "Over Budget ⚠️", color: "bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]" };
    if (avg > 150) return { label: "Near Limit ⚡", color: "bg-[#FEFCE8] text-[#CA8A04] border-[#FEF08A]" };
    return { label: "On Budget ✓", color: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]" };
  }, [budget]);
  /* ── Merged Day-wise Physical Activities & Expenses Flow (Screen 9 Wireframe) ── */
  const dayWiseFlow = useMemo(() => {
    if (!budget) return [];
    // Group scheduled activities by day
    const daysMap: Record<string, { date: string; cityName: string; activities: any[]; expenses: any[] }> = {};
    (budget.scheduledActivitiesList || []).forEach((sa) => {
      const dKey = sa.scheduledDate?.split("T")[0] || "Unscheduled";
      if (!daysMap[dKey]) {
        daysMap[dKey] = { date: dKey, cityName: sa.cityName || "Destination", activities: [], expenses: [] };
      }
      daysMap[dKey].activities.push({
        id: sa.stopActivityId,
        title: sa.activityName,
        cityName: sa.cityName,
        cost: sa.cost,
        type: "ACTIVITY",
      });
    });
    // Group logged expenses by day
    (budget.dailyExpenses || []).forEach((dg) => {
      const dKey = dg.date;
      if (!daysMap[dKey]) {
        daysMap[dKey] = { date: dKey, cityName: "Trip Expense", activities: [], expenses: [] };
      }
      dg.items.forEach((item) => {
        daysMap[dKey].expenses.push({
          id: item.id,
          title: item.description || item.category,
          category: item.category,
          cityName: item.cityName,
          amount: item.amount,
        });
      });
    });
    let result = Object.values(daysMap);
    // Filter by Place/City if selected
    if (selectedCityFilter !== "ALL") {
      result = result.filter(
        (d) =>
          d.cityName.toLowerCase() === selectedCityFilter.toLowerCase() ||
          d.activities.some((a) => a.cityName?.toLowerCase() === selectedCityFilter.toLowerCase())
      );
    }
    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.cityName.toLowerCase().includes(q) ||
          d.activities.some((a) => a.title.toLowerCase().includes(q)) ||
          d.expenses.some((e) => e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
      );
    }
    // Sort
    result.sort((a, b) => {
      if (sortBy === "date") return a.date.localeCompare(b.date);
      const totalA = a.activities.reduce((s, i) => s + i.cost, 0) + a.expenses.reduce((s, i) => s + i.amount, 0);
      const totalB = b.activities.reduce((s, i) => s + i.cost, 0) + b.expenses.reduce((s, i) => s + i.amount, 0);
      return sortBy === "costDesc" ? totalB - totalA : totalA - totalB;
    });
    return result;
  }, [budget, selectedCityFilter, searchQuery, sortBy]);
  if (isBudgetLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <AppNav />
        <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-col gap-6">
          <div className="h-10 bg-[#F1EDE6] rounded-xl w-1/3 animate-pulse" />
          <div className="h-44 bg-[#F1EDE6] rounded-2xl animate-pulse" />
          <div className="h-96 bg-[#F1EDE6] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }
  if (isError || !budget) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <AppNav />
        <div className="max-w-[600px] mx-auto px-6 py-20 text-center flex flex-col items-center gap-4">
          <span className="text-4xl">💰</span>
          <h1 className={`text-2xl font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
            Budget Data Not Found
          </h1>
          <p className="text-sm text-[#5C5468]">
            Could not load financial breakdown for this trip.
          </p>
          <Link
            href={`/trips/${tripId}`}
            className="px-5 py-2.5 bg-[#714B67] text-white font-semibold text-sm rounded-xl hover:bg-[#4E3347]"
          >
            Back to Itinerary
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className={`min-h-screen bg-[#FAF8F5] text-[#241B2F] ${inter.className}`}>
      <AppNav />
      {/* ── Sub-header Navigation ── */}
      <div className="w-full bg-white border-b border-[#E7E0D4] px-6 py-3">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/trips/${tripId}`}
              className="text-[13px] font-semibold text-[#714B67] hover:text-[#4E3347] transition-colors flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-[#F1E7EE]"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Itinerary View
            </Link>
            <span className="text-[#D6CCBC]">/</span>
            <h1 className={`font-bold text-[#241B2F] text-[16px] truncate max-w-[300px] ${spaceGrotesk.className}`}>
              {budget.tripName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/trips/${tripId}`}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#5C5468] hover:text-[#241B2F] rounded-lg border border-[#E7E0D4]"
            >
              📋 View Itinerary
            </Link>
            <Link
              href={`/trips/${tripId}/builder`}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#5C5468] hover:text-[#241B2F] rounded-lg border border-[#E7E0D4]"
            >
              ✏️ Builder
            </Link>
            <span className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#714B67] rounded-lg shadow-sm">
              💰 Budget & Costs
            </span>
          </div>
        </div>
      </div>
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* ════════════════════════════════════════════════════════════
            1. DISPLAY-XL TOTAL COST & BUDGET STATUS BANNER (Screen 9)
           ════════════════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#E7E0D4] rounded-2xl p-6 sm:p-8 shadow-[0_4px_16px_rgba(36,27,47,0.04)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9A93A6]">
                Total Estimated Trip Cost
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${budgetStatus.color}`}>
                {budgetStatus.label}
              </span>
            </div>
            
            <div className="flex items-baseline gap-4">
              <span className={`text-4xl sm:text-5xl font-bold text-[#241B2F] tracking-tight ${ibmPlexMono.className}`}>
                {formatMoney(grandTotalCost)}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#714B67] bg-[#F1E7EE] px-3 py-1.5 rounded-xl border border-[#714B67]/20">
                <span>Avg:</span>
                <span className={`font-bold ${ibmPlexMono.className}`}>
                  {formatMoney(budget.averageCostPerDay)}/day
                </span>
                <span className="text-[#9A93A6]">({budget.durationDays} days)</span>
              </div>
            </div>
          </div>
          {/* Quick Metrics & CTA */}
          <div className="flex items-center gap-4 flex-wrap w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-[#F1EDE6]">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[11px] text-[#9A93A6] uppercase font-bold">Scheduled Activities</p>
                <p className={`text-lg font-bold text-[#2563EB] ${ibmPlexMono.className}`}>
                  {formatMoney(budget.totalEstimatedActivitiesCost)}
                </p>
              </div>
              <div className="w-px h-8 bg-[#E7E0D4]" />
              <div>
                <p className="text-[11px] text-[#9A93A6] uppercase font-bold">Logged Expenses</p>
                <p className={`text-lg font-bold text-[#059669] ${ibmPlexMono.className}`}>
                  {formatMoney(budget.totalLoggedExpense)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddExpenseModal(true)}
              className="px-5 py-3 bg-[#714B67] hover:bg-[#4E3347] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
            >
              <span>+ Log Expense</span>
            </button>
          </div>
        </div>
        {/* ════════════════════════════════════════════════════════════
            2. CATEGORY BREAKDOWN CARDS & PROGRESS BARS
           ════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4">
          <h2 className={`text-sm font-bold uppercase tracking-wider text-[#241B2F] ${spaceGrotesk.className}`}>
            Cost Breakdown by Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {(budget.categoryBreakdown || []).map((catItem) => {
              const catStyle = CATEGORY_COLORS[catItem.category] || CATEGORY_COLORS.OTHER;
              return (
                <div
                  key={catItem.category}
                  className="bg-white border border-[#E7E0D4] rounded-2xl p-4 flex flex-col gap-2.5 shadow-2xs hover:border-[#D6CCBC] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                      style={{ backgroundColor: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}
                    >
                      {catItem.category}
                    </span>
                    <span className={`text-[11px] font-semibold text-[#9A93A6] ${ibmPlexMono.className}`}>
                      {catItem.percentage}%
                    </span>
                  </div>
                  <p className={`text-xl font-bold text-[#241B2F] ${ibmPlexMono.className}`}>
                    {formatMoney(catItem.amount)}
                  </p>
                  <div className="w-full bg-[#F1EDE6] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, catItem.percentage)}%`, backgroundColor: catStyle.bar }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* ════════════════════════════════════════════════════════════
            3. CONTROLS BAR (Search, Group by, Filter, Sort by)
           ════════════════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#E7E0D4] rounded-2xl p-4 shadow-[0_4px_16px_rgba(36,27,47,0.04)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search bar ... (Search activity or expense)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F1EDE6] border border-transparent rounded-xl pl-9 pr-4 py-2 text-xs text-[#241B2F] outline-none focus:border-[#714B67] focus:bg-white"
            />
            <span className="absolute left-3 top-2 text-sm text-[#9A93A6]">🔍</span>
          </div>
          {/* Place / Stop filter dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedCityFilter}
              onChange={(e) => setSelectedCityFilter(e.target.value)}
              className="bg-[#F1EDE6] border border-transparent rounded-xl px-3 py-2 text-xs font-semibold text-[#241B2F] outline-none hover:border-[#D6CCBC]"
            >
              <option value="ALL">Group by: All Destinations</option>
              {(budget.stopBreakdown || []).map((stop) => (
                <option key={stop.stopId} value={stop.cityName}>
                  📍 {stop.cityName}, {stop.country}
                </option>
              ))}
            </select>
            {/* Sort by dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#F1EDE6] border border-transparent rounded-xl px-3 py-2 text-xs font-semibold text-[#241B2F] outline-none hover:border-[#D6CCBC]"
            >
              <option value="date">Sort by: Date ↑</option>
              <option value="costDesc">Sort by: Expense ↓</option>
              <option value="costAsc">Sort by: Expense ↑</option>
            </select>
          </div>
        </div>
        {/* ════════════════════════════════════════════════════════════
            4. SCREEN 9 WIREFRAME: ITINERARY FOR A SELECTED PLACE FLOW
               (Two-column layout: Physical Activity ↓ | Expense)
           ════════════════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#E7E0D4] rounded-2xl p-6 sm:p-8 shadow-[0_4px_16px_rgba(36,27,47,0.04)] flex flex-col gap-8">
          <div className="flex items-center justify-between border-b border-[#F1EDE6] pb-4">
            <div>
              <h2 className={`text-xl sm:text-2xl font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                Itinerary for a selected place
              </h2>
              <p className="text-xs text-[#5C5468] mt-0.5">
                Day-by-day side-by-side flow of physical activities and corresponding expenses.
              </p>
            </div>
            {selectedCityFilter !== "ALL" && (
              <span className="px-3 py-1 bg-[#F1E7EE] text-[#714B67] text-xs font-bold rounded-lg border border-[#714B67]/20">
                📍 {selectedCityFilter}
              </span>
            )}
          </div>
          {dayWiseFlow.length > 0 ? (
            <div className="flex flex-col gap-10">
              {dayWiseFlow.map((dayGroup, dayIdx) => (
                <div key={dayGroup.date} className="flex flex-col gap-4">
                  {/* Day Badge */}
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-xl bg-[#714B67] text-white text-xs font-bold ${ibmPlexMono.className}`}>
                      Day {dayIdx + 1}
                    </span>
                    <span className={`text-xs text-[#5C5468] font-semibold ${ibmPlexMono.className}`}>
                      {formatDate(dayGroup.date)} • {dayGroup.cityName}
                    </span>
                    <div className="flex-1 h-px bg-[#E7E0D4]" />
                  </div>
                  {/* Header Row: Physical Activity | Expense */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 font-bold text-xs uppercase tracking-wider text-[#9A93A6] border-b border-[#FAF8F5] pb-1">
                    <div className="md:col-span-8 flex items-center gap-1.5">
                      <span>🏃‍♂️</span> Physical Activity
                    </div>
                    <div className="md:col-span-4 flex items-center justify-between">
                      <span>💳 Expense</span>
                      <span>Amount</span>
                    </div>
                  </div>
                  {/* Physical Activities & Corresponding Expenses Rows */}
                  <div className="flex flex-col gap-3">
                    {/* 1. Scheduled Itinerary Activities */}
                    {dayGroup.activities.map((act, actIdx) => (
                      <div key={act.id} className="flex flex-col gap-1.5">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          {/* Physical Activity Card */}
                          <div className="md:col-span-8 bg-[#FAF8F5] border border-[#E7E0D4] rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-xs font-bold">
                                {actIdx + 1}
                              </span>
                              <div>
                                <p className="text-xs font-bold text-[#241B2F]">{act.title}</p>
                                <p className="text-[11px] text-[#5C5468]">Scheduled Activity • {act.cityName}</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB]">
                              Itinerary
                            </span>
                          </div>
                          {/* Matching Expense Box */}
                          <div className="md:col-span-4 bg-white border border-[#E7E0D4] rounded-xl p-4 flex items-center justify-between">
                            <span className="text-xs text-[#5C5468] font-medium">Activity Est.</span>
                            <span className={`text-xs font-bold text-[#241B2F] ${ibmPlexMono.className}`}>
                              {act.cost === 0 ? "Free" : formatMoney(act.cost)}
                            </span>
                          </div>
                        </div>
                        {/* Directional Down Arrow Connector */}
                        {actIdx < dayGroup.activities.length - 1 && (
                          <div className="flex justify-center md:justify-start md:ml-24 my-0.5 text-[#E0663D]">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path d="M8 2v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* 2. Logged Expenses for the day */}
                    {dayGroup.expenses.map((exp) => {
                      const catStyle = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.OTHER;
                      return (
                        <div key={exp.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          {/* Logged Item Description */}
                          <div className="md:col-span-8 bg-[#FAF8F5] border border-[#E7E0D4] rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-base">💳</span>
                              <div>
                                <p className="text-xs font-bold text-[#241B2F]">{exp.title}</p>
                                <p className="text-[11px] text-[#5C5468]">Logged Expense {exp.cityName ? `• ${exp.cityName}` : ""}</p>
                              </div>
                            </div>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                              style={{ backgroundColor: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}
                            >
                              {exp.category}
                            </span>
                          </div>
                          {/* Matching Expense Value + Delete */}
                          <div className="md:col-span-4 bg-white border border-[#E7E0D4] rounded-xl p-4 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="text-[11px] text-[#C0392B] hover:underline"
                            >
                              Remove
                            </button>
                            <span className={`text-xs font-bold text-[#059669] ${ibmPlexMono.className}`}>
                              {formatMoney(exp.amount)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center flex flex-col items-center gap-3 border border-[#E7E0D4] rounded-2xl p-6">
              <span className="text-3xl">🧾</span>
              <p className={`text-base font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                No expenses or activities found matching filters
              </p>
              <p className="text-xs text-[#5C5468]">
                Try clearing search filters or log a new expense item.
              </p>
            </div>
          )}
        </div>
      </main>
      {/* ════════════════════════════════════════════════════════════
          LOG EXPENSE MODAL
         ════════════════════════════════════════════════════════════ */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E7E0D4] rounded-2xl w-full max-w-[480px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-1.5 bg-[#714B67]" />
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-[18px] font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                  Log New Expense
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="text-[#9A93A6] hover:text-[#241B2F] text-lg font-bold"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={onAddExpenseSubmit} className="flex flex-col gap-4">
                {/* Category */}
                <div>
                  <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full bg-[#F1EDE6] border border-transparent rounded-xl px-3 py-2.5 text-[13px] text-[#241B2F] outline-none focus:border-[#714B67] focus:bg-white"
                  >
                    <option value="MEALS">🍔 Meals & Food</option>
                    <option value="TRANSPORT">🚕 Transport & Flight</option>
                    <option value="STAY">🏨 Stay & Accommodation</option>
                    <option value="ACTIVITIES">🎟 Activities & Tickets</option>
                    <option value="OTHER">🛍 Other / Shopping</option>
                  </select>
                </div>
                {/* Amount & Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                      Amount (₹) <span className="text-[#C0392B]">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={expAmount}
                      onChange={(e) => setExpAmount(Number(e.target.value))}
                      required
                      className={`w-full bg-[#F1EDE6] border border-transparent rounded-xl px-3 py-2 text-[13px] text-[#241B2F] outline-none focus:border-[#714B67] focus:bg-white ${ibmPlexMono.className}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                      Date <span className="text-[#C0392B]">*</span>
                    </label>
                    <input
                      type="date"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      required
                      className={`w-full bg-[#F1EDE6] border border-transparent rounded-xl px-3 py-2 text-[13px] text-[#241B2F] outline-none focus:border-[#714B67] focus:bg-white ${ibmPlexMono.className}`}
                    />
                  </div>
                </div>
                {/* Optional Destination Stop */}
                {trip?.stops && trip.stops.length > 0 && (
                  <div>
                    <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                      Link to City Stop <span className="text-[#9A93A6] normal-case font-normal">(optional)</span>
                    </label>
                    <select
                      value={expStopId}
                      onChange={(e) => setExpStopId(e.target.value)}
                      className="w-full bg-[#F1EDE6] border border-transparent rounded-xl px-3 py-2.5 text-[13px] text-[#241B2F] outline-none focus:border-[#714B67] focus:bg-white"
                    >
                      <option value="">-- General Trip Expense --</option>
                      {trip.stops.map((st) => (
                        <option key={st.id} value={st.id}>
                          📍 {st.city?.name}, {st.city?.country}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Description */}
                <div>
                  <label className="block text-[12px] font-bold text-[#241B2F] uppercase tracking-wider mb-1.5">
                    Description / Note <span className="text-[#9A93A6] normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Taxi fare to hotel, Dinner at seafood bistro"
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    className="w-full bg-[#F1EDE6] border border-transparent rounded-xl px-3 py-2 text-[13px] text-[#241B2F] outline-none focus:border-[#714B67] focus:bg-white"
                  />
                </div>
                {/* Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddExpenseModal(false)}
                    className="px-4 py-2 text-[13px] font-semibold text-[#5C5468] hover:bg-[#F1EDE6] rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingExp}
                    className="px-5 py-2 text-[13px] font-bold bg-[#714B67] hover:bg-[#4E3347] text-white rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    {isAddingExp ? "Logging..." : "Save Expense"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
