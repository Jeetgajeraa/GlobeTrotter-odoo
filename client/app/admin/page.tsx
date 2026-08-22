"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import cookies from "js-cookie";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  MapPin,
  Sparkles,
  TrendingUp,
  BarChart3,
  Globe,
  Compass,
  DollarSign,
  Shield,
  ShieldAlert,
  Search,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  ChevronRight,
  Eye,
  Calendar,
  Layers,
  Award,
  Filter,
  PieChart as PieChartIcon,
  Activity as ActivityIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  LogOut,
} from "lucide-react";

import {
  getAdminAnalytics,
  getAdminPopularDestinations,
  getAdminPopularActivities,
  getAdminUsers,
  getAdminAllTrips,
  getMe,
} from "@/src/libs/interaction/dataGetter";
import { createCity, createActivity } from "@/src/libs/interaction/dataPoster";
import {
  updateAdminUserRole,
  updateCity,
  updateActivity,
} from "@/src/libs/interaction/dataPatcher";
import {
  deleteCity,
  deleteActivity,
  deleteTrip,
} from "@/src/libs/interaction/dataDeleter";
import { useToast } from "@/src/hooks/useToast";
import { formatINR } from "@/src/libs/utils";

import type {
  AdminAnalyticsData,
  AdminPopularDestination,
  AdminPopularActivity,
  AdminUserListItem,
  AdminPlatformTrip,
} from "@/src/libs/types";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"] });

type AdminTab = "analytics" | "users" | "cities" | "activities" | "trips";

export default function AdminDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>("analytics");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
  const [tripSearch, setTripSearch] = useState("");
  const [tripStatusFilter, setTripStatusFilter] = useState<string>("ALL");
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  // Check current user role
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["authMe"],
    queryFn: getMe,
  });

  const currentUser = userData?.data?.user;

  // Protect Admin Route: Redirect if not admin
  useEffect(() => {
    if (!isUserLoading && userData) {
      if (!currentUser || currentUser.role !== "ADMIN") {
        toast({
          title: "Access Denied",
          description: "Admin privileges are required to view this panel.",
          variant: "destructive",
        });
        router.push("/");
      }
    }
  }, [isUserLoading, userData, currentUser, router, toast]);

  // Queries for Screen 12 Tabs
  const {
    data: analyticsRes,
    isLoading: isAnalyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["adminAnalytics"],
    queryFn: getAdminAnalytics,
    enabled: currentUser?.role === "ADMIN",
  });

  const {
    data: popularCitiesRes,
    isLoading: isCitiesLoading,
    refetch: refetchCities,
  } = useQuery({
    queryKey: ["adminPopularDestinations"],
    queryFn: () => getAdminPopularDestinations(20),
    enabled: currentUser?.role === "ADMIN",
  });

  const {
    data: popularActivitiesRes,
    isLoading: isActivitiesLoading,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: ["adminPopularActivities"],
    queryFn: () => getAdminPopularActivities(20),
    enabled: currentUser?.role === "ADMIN",
  });

  const {
    data: usersRes,
    isLoading: isUsersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["adminUsers", userSearch, userRoleFilter],
    queryFn: () =>
      getAdminUsers({
        search: userSearch || undefined,
        role: userRoleFilter !== "ALL" ? userRoleFilter : undefined,
        limit: 50,
      }),
    enabled: currentUser?.role === "ADMIN" && activeTab === "users",
  });

  const {
    data: tripsRes,
    isLoading: isTripsLoading,
    refetch: refetchTrips,
  } = useQuery({
    queryKey: ["adminTrips", tripSearch, tripStatusFilter],
    queryFn: () =>
      getAdminAllTrips({
        search: tripSearch || undefined,
        status: tripStatusFilter !== "ALL" ? tripStatusFilter : undefined,
        limit: 50,
      }),
    enabled: currentUser?.role === "ADMIN" && activeTab === "trips",
  });

  // Mutation to update user role
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "USER" | "ADMIN" }) =>
      updateAdminUserRole(userId, role),
    onSuccess: (res) => {
      if (res?.success) {
        toast({
          title: "Role Updated",
          description: "User role permissions updated successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
        queryClient.invalidateQueries({ queryKey: ["adminAnalytics"] });
      } else {
        toast({
          title: "Update Failed",
          description: res?.message || "Could not update user role.",
          variant: "destructive",
        });
      }
    },
  });

  const handleToggleRole = (user: AdminUserListItem) => {
    if (user.id === currentUser?.id) {
      toast({
        title: "Action Forbidden",
        description: "You cannot change your own admin role.",
        variant: "destructive",
      });
      return;
    }

    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    roleMutation.mutate({ userId: user.id, role: newRole });
  };

  // Modal states for City
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<AdminPopularDestination | null>(null);
  const [cityFormData, setCityFormData] = useState({
    name: "",
    country: "",
    region: "",
    costIndex: 50,
    popularity: 0,
    imageUrl: "",
  });
  const [cityImageFile, setCityImageFile] = useState<File | null>(null);

  // Modal states for Activity
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<AdminPopularActivity | null>(null);
  const [activityFormData, setActivityFormData] = useState({
    cityId: "",
    name: "",
    description: "",
    category: "SIGHTSEEING",
    cost: 0,
    durationMin: 60,
    imageUrl: "",
  });
  const [activityImageFile, setActivityImageFile] = useState<File | null>(null);

  // Delete Confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "city" | "activity" | "trip";
    id: string;
    name: string;
  } | null>(null);

  // City Mutations
  const citySaveMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("name", cityFormData.name);
      fd.append("country", cityFormData.country);
      if (cityFormData.region) fd.append("region", cityFormData.region);
      fd.append("costIndex", String(cityFormData.costIndex));
      fd.append("popularity", String(cityFormData.popularity));
      if (cityImageFile) {
        fd.append("imageUrl", cityImageFile);
      } else if (cityFormData.imageUrl) {
        fd.append("imageUrl", cityFormData.imageUrl);
      }

      if (editingCity) {
        return updateCity(editingCity.id, fd);
      } else {
        return createCity(fd);
      }
    },
    onSuccess: (res) => {
      if (res?.success) {
        toast({
          title: editingCity ? "City Updated" : "City Created",
          description: res.message || "Destination saved successfully.",
        });
        setIsCityModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["adminPopularDestinations"] });
        queryClient.invalidateQueries({ queryKey: ["adminAnalytics"] });
      } else {
        toast({
          title: "Save Failed",
          description: res?.message || "Could not save city.",
          variant: "destructive",
        });
      }
    },
  });

  const cityDeleteMutation = useMutation({
    mutationFn: (cityId: string) => deleteCity(cityId),
    onSuccess: (res) => {
      if (res?.success) {
        toast({ title: "City Deleted", description: "City removed from catalog." });
        setDeleteConfirm(null);
        queryClient.invalidateQueries({ queryKey: ["adminPopularDestinations"] });
        queryClient.invalidateQueries({ queryKey: ["adminAnalytics"] });
      } else {
        toast({ title: "Delete Failed", description: res?.message || "Could not delete city.", variant: "destructive" });
      }
    },
  });

  // Activity Mutations
  const activitySaveMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (!editingActivity) {
        fd.append("cityId", activityFormData.cityId);
      }
      fd.append("name", activityFormData.name);
      if (activityFormData.description) fd.append("description", activityFormData.description);
      fd.append("category", activityFormData.category);
      fd.append("cost", String(activityFormData.cost));
      fd.append("durationMin", String(activityFormData.durationMin));
      if (activityImageFile) {
        fd.append("imageUrl", activityImageFile);
      } else if (activityFormData.imageUrl) {
        fd.append("imageUrl", activityFormData.imageUrl);
      }

      if (editingActivity) {
        return updateActivity(editingActivity.id, fd);
      } else {
        return createActivity(fd);
      }
    },
    onSuccess: (res) => {
      if (res?.success) {
        toast({
          title: editingActivity ? "Activity Updated" : "Activity Created",
          description: res.message || "Activity saved successfully.",
        });
        setIsActivityModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["adminPopularActivities"] });
        queryClient.invalidateQueries({ queryKey: ["adminAnalytics"] });
      } else {
        toast({
          title: "Save Failed",
          description: res?.message || "Could not save activity.",
          variant: "destructive",
        });
      }
    },
  });

  const activityDeleteMutation = useMutation({
    mutationFn: (activityId: string) => deleteActivity(activityId),
    onSuccess: (res) => {
      if (res?.success) {
        toast({ title: "Activity Deleted", description: "Activity removed from catalog." });
        setDeleteConfirm(null);
        queryClient.invalidateQueries({ queryKey: ["adminPopularActivities"] });
        queryClient.invalidateQueries({ queryKey: ["adminAnalytics"] });
      } else {
        toast({ title: "Delete Failed", description: res?.message || "Could not delete activity.", variant: "destructive" });
      }
    },
  });

  // Trip Delete Mutation
  const tripDeleteMutation = useMutation({
    mutationFn: (tripId: string) => deleteTrip(tripId),
    onSuccess: (res) => {
      if (res?.success) {
        toast({ title: "Trip Moderated", description: "Trip deleted from platform." });
        setDeleteConfirm(null);
        queryClient.invalidateQueries({ queryKey: ["adminTrips"] });
        queryClient.invalidateQueries({ queryKey: ["adminAnalytics"] });
      } else {
        toast({ title: "Delete Failed", description: res?.message || "Could not delete trip.", variant: "destructive" });
      }
    },
  });

  const handleOpenCreateCity = () => {
    setEditingCity(null);
    setCityFormData({
      name: "",
      country: "",
      region: "",
      costIndex: 50,
      popularity: 0,
      imageUrl: "",
    });
    setCityImageFile(null);
    setIsCityModalOpen(true);
  };

  const handleOpenEditCity = (city: AdminPopularDestination) => {
    setEditingCity(city);
    setCityFormData({
      name: city.name,
      country: city.country,
      region: city.region || "",
      costIndex: city.costIndex || 50,
      popularity: city.popularity || 0,
      imageUrl: city.imageUrl || "",
    });
    setCityImageFile(null);
    setIsCityModalOpen(true);
  };

  const handleOpenCreateActivity = () => {
    setEditingActivity(null);
    setActivityFormData({
      cityId: popularCitiesRes?.data?.[0]?.id || "",
      name: "",
      description: "",
      category: "SIGHTSEEING",
      cost: 0,
      durationMin: 60,
      imageUrl: "",
    });
    setActivityImageFile(null);
    setIsActivityModalOpen(true);
  };

  const handleOpenEditActivity = (act: AdminPopularActivity) => {
    setEditingActivity(act);
    setActivityFormData({
      cityId: act.cityId || "",
      name: act.name,
      description: act.description || "",
      category: act.category || "SIGHTSEEING",
      cost: act.cost || 0,
      durationMin: act.durationMin || 60,
      imageUrl: act.imageUrl || "",
    });
    setActivityImageFile(null);
    setIsActivityModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "city") {
      cityDeleteMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.type === "activity") {
      activityDeleteMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.type === "trip") {
      tripDeleteMutation.mutate(deleteConfirm.id);
    }
  };

  const analyticsData: AdminAnalyticsData | undefined = analyticsRes?.data;
  const popularCities: AdminPopularDestination[] = popularCitiesRes?.data || [];
  const popularActivitiesData = popularActivitiesRes?.data;
  const usersList: AdminUserListItem[] = usersRes?.data?.users || [];
  const tripsList: AdminPlatformTrip[] = tripsRes?.data?.trips || [];

  const handleRefreshCurrentTab = () => {
    if (activeTab === "analytics") {
      refetchAnalytics();
      refetchCities();
      refetchActivities();
    }
    if (activeTab === "users") refetchUsers();
    if (activeTab === "cities") refetchCities();
    if (activeTab === "activities") refetchActivities();
    if (activeTab === "trips") refetchTrips();
    toast({ title: "Refreshed", description: "Admin data updated to live state." });
  };

  const handleLogout = () => {
    cookies.remove("token");
    toast({ title: "Signed out", description: "Logged out from admin panel." });
    router.push("/auth");
  };

  // Donut chart calculations
  const totalTripsCount = analyticsData?.tripStatusDistribution?.total || 1;
  const ongoingPercent = Math.round(
    ((analyticsData?.tripStatusDistribution?.ongoing || 0) / totalTripsCount) * 100
  );
  const upcomingPercent = Math.round(
    ((analyticsData?.tripStatusDistribution?.upcoming || 0) / totalTripsCount) * 100
  );
  const completedPercent = Math.max(0, 100 - ongoingPercent - upcomingPercent);

  // SVG Donut geometry
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const ongoingDash = (ongoingPercent / 100) * circumference;
  const upcomingDash = (upcomingPercent / 100) * circumference;
  const completedDash = (completedPercent / 100) * circumference;

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#714B67]/20 border-t-[#714B67] rounded-full animate-spin mb-4" />
        <p className={`${inter.className} text-[14px] text-[#5C5468]`}>Authenticating admin session...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#FAF8F5] text-[#241B2F] ${inter.className}`}>
      {/* ── Top Admin Header / Bar ── */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E7E0D4] px-6 lg:px-12 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#714B67] flex items-center justify-center text-white shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`${spaceGrotesk.className} font-bold text-[16px] text-[#241B2F]`}>
                GlobeTrotter
              </span>
              <span className="bg-[#714B67] text-white text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full tracking-wider">
                Admin Panel
              </span>
            </div>
            <p className="text-[12px] text-[#5C5468] hidden sm:block">
              Platform Governance, Insights & Analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E0D4] bg-white hover:bg-[#F1EDE6] text-[13px] font-medium text-[#5C5468] transition-colors cursor-pointer"
            title="Go to main traveler app"
          >
            <Compass className="w-3.5 h-3.5 text-[#714B67]" />
            <span className="hidden sm:inline">Main App</span>
          </Link>

          <button
            onClick={handleRefreshCurrentTab}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E0D4] bg-white hover:bg-[#F1EDE6] text-[13px] font-medium text-[#5C5468] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#714B67]" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="flex items-center gap-2.5 pl-3 border-l border-[#E7E0D4]">
            <div className="w-8 h-8 rounded-full bg-[#F1E7EE] border border-[#714B67]/30 flex items-center justify-center text-[#714B67] font-semibold text-[13px]">
              {currentUser?.firstName?.charAt(0) || "A"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-[13px] font-semibold leading-none text-[#241B2F]">
                {currentUser?.firstName} {currentUser?.lastName}
              </p>
              <p className="text-[11px] text-[#2F7A6F] font-medium leading-tight mt-0.5">
                ● Super Admin
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E7E0D4] bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-[13px] font-medium text-[#5C5468] transition-colors cursor-pointer ml-1"
              title="Sign out from admin panel"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {/* Page Title & Status */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className={`${spaceGrotesk.className} text-[28px] sm:text-[32px] font-bold text-[#241B2F]`}>
              Admin & Analytics Dashboard
            </h1>
            <p className="text-[14px] text-[#5C5468] mt-1">
              Visual analytics and live telemetry tracking platform growth, trip creation trends, and destination rankings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF7F5] border border-[#2F7A6F]/30 text-[#2F7A6F] text-[12px] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#2F7A6F] animate-pulse" />
              Live Server Connected
            </span>
          </div>
        </div>

        {/* ── Screen 12 Tabs (Navigation Bar) ── */}
        <div className="flex items-center gap-1.5 bg-[#F1EDE6] p-1.5 rounded-xl border border-[#E7E0D4] overflow-x-auto mb-8 scrollbar-none">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "analytics"
                ? "bg-white text-[#714B67] shadow-sm font-semibold"
                : "text-[#5C5468] hover:text-[#241B2F] hover:bg-white/50"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>User Trends & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "users"
                ? "bg-white text-[#714B67] shadow-sm font-semibold"
                : "text-[#5C5468] hover:text-[#241B2F] hover:bg-white/50"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manage Users</span>
            {analyticsData?.summary?.totalUsers !== undefined && (
              <span className={`${ibmPlexMono.className} text-[11px] px-1.5 py-0.2 rounded-full bg-[#F1E7EE] text-[#714B67]`}>
                {analyticsData.summary.totalUsers}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("cities")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "cities"
                ? "bg-white text-[#714B67] shadow-sm font-semibold"
                : "text-[#5C5468] hover:text-[#241B2F] hover:bg-white/50"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Popular Cities</span>
          </button>

          <button
            onClick={() => setActiveTab("activities")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "activities"
                ? "bg-white text-[#714B67] shadow-sm font-semibold"
                : "text-[#5C5468] hover:text-[#241B2F] hover:bg-white/50"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Popular Activities</span>
          </button>

          <button
            onClick={() => setActiveTab("trips")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "trips"
                ? "bg-white text-[#714B67] shadow-sm font-semibold"
                : "text-[#5C5468] hover:text-[#241B2F] hover:bg-white/50"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>All Platform Trips</span>
            {analyticsData?.summary?.totalTrips !== undefined && (
              <span className={`${ibmPlexMono.className} text-[11px] px-1.5 py-0.2 rounded-full bg-[#EBF7F5] text-[#2F7A6F]`}>
                {analyticsData.summary.totalTrips}
              </span>
            )}
          </button>
        </div>

        {/* ══════════════════════════════════════════════════
            TAB 1: USER TRENDS & ANALYTICS OVERVIEW (WITH CHARTS)
           ══════════════════════════════════════════════════ */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Users */}
              <div className="bg-white rounded-xl border border-[#E7E0D4] p-5 shadow-xs hover:border-[#D6CCBC] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#5C5468]">Registered Travelers</span>
                  <div className="w-9 h-9 rounded-lg bg-[#F1E7EE] text-[#714B67] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className={`${spaceGrotesk.className} text-[28px] font-bold text-[#241B2F] mt-2`}>
                  {analyticsData?.summary?.totalUsers ?? 0}
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[#2F7A6F] mt-2 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Platform Community</span>
                </div>
              </div>

              {/* Total Trips */}
              <div className="bg-white rounded-xl border border-[#E7E0D4] p-5 shadow-xs hover:border-[#D6CCBC] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#5C5468]">Trips Created</span>
                  <div className="w-9 h-9 rounded-lg bg-[#FFF2ED] text-[#E0663D] flex items-center justify-center">
                    <Compass className="w-4 h-4" />
                  </div>
                </div>
                <div className={`${spaceGrotesk.className} text-[28px] font-bold text-[#241B2F] mt-2`}>
                  {analyticsData?.summary?.totalTrips ?? 0}
                </div>
                <div className="text-[12px] text-[#5C5468] mt-2">
                  <span className={`${ibmPlexMono.className} font-semibold text-[#241B2F]`}>
                    {analyticsData?.summary?.totalStops ?? 0}
                  </span>{" "}
                  multi-city stops planned
                </div>
              </div>

              {/* Total Platform Spend */}
              <div className="bg-white rounded-xl border border-[#E7E0D4] p-5 shadow-xs hover:border-[#D6CCBC] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#5C5468]">Logged Trip Spend</span>
                  <div className="w-9 h-9 rounded-lg bg-[#EBF7F5] text-[#2F7A6F] flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className={`${ibmPlexMono.className} text-[26px] font-bold text-[#241B2F] mt-2`}>
                  ${(analyticsData?.summary?.totalPlatformSpend ?? 0).toLocaleString()}
                </div>
                <div className="text-[12px] text-[#5C5468] mt-2">
                  Across{" "}
                  <span className={`${ibmPlexMono.className} font-semibold text-[#241B2F]`}>
                    {analyticsData?.summary?.totalExpensesCount ?? 0}
                  </span>{" "}
                  logged expenses
                </div>
              </div>

              {/* Catalog Items */}
              <div className="bg-white rounded-xl border border-[#E7E0D4] p-5 shadow-xs hover:border-[#D6CCBC] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#5C5468]">Destinations & Experiences</span>
                  <div className="w-9 h-9 rounded-lg bg-[#FEF6E7] text-[#EFA928] flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <div className={`${spaceGrotesk.className} text-[28px] font-bold text-[#241B2F] mt-2`}>
                  {(analyticsData?.summary?.totalCities ?? 0) + (analyticsData?.summary?.totalActivities ?? 0)}
                </div>
                <div className="text-[12px] text-[#5C5468] mt-2">
                  <span className={`${ibmPlexMono.className} font-semibold text-[#241B2F]`}>
                    {analyticsData?.summary?.totalCities ?? 0}
                  </span>{" "}
                  cities ·{" "}
                  <span className={`${ibmPlexMono.className} font-semibold text-[#241B2F]`}>
                    {analyticsData?.summary?.totalActivities ?? 0}
                  </span>{" "}
                  activities
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                GRAPHICAL CHART ROW 1: MONTHLY BAR & AREA CHART + DONUT CHART
               ══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Graphical Chart 1: Interactive Monthly Growth (SVG Bar/Column Chart) */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-[#E7E0D4] p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#714B67]" />
                        <h3 className={`${spaceGrotesk.className} text-[18px] font-bold text-[#241B2F]`}>
                          Monthly Growth & Trip Telemetry
                        </h3>
                      </div>
                      <p className="text-[13px] text-[#5C5468] mt-0.5">
                        Interactive comparison of Trips Created vs New User Signups
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-[12px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-[#714B67]" />
                        <span className="font-medium text-[#5C5468]">Trips Created</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-[#2F7A6F]" />
                        <span className="font-medium text-[#5C5468]">New Travelers</span>
                      </div>
                    </div>
                  </div>

                  {/* Graphical Visual Chart Container */}
                  {isAnalyticsLoading ? (
                    <div className="h-64 flex items-center justify-center text-[#5C5468]">
                      Rendering telemetry chart...
                    </div>
                  ) : analyticsData?.monthlyTrends?.length ? (
                    <div className="pt-4 pb-2">
                      <div className="h-56 flex items-end justify-between gap-3 sm:gap-6 border-b border-[#E7E0D4] pb-2 relative">
                        {/* Background Gridlines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                          <div className="border-b border-dashed border-[#E7E0D4]" />
                          <div className="border-b border-dashed border-[#E7E0D4]" />
                          <div className="border-b border-dashed border-[#E7E0D4]" />
                        </div>

                        {/* Columns */}
                        {analyticsData.monthlyTrends.map((item, idx) => {
                          const maxVal = Math.max(
                            ...analyticsData.monthlyTrends.map((t) => Math.max(t.trips, t.newUsers)),
                            5
                          );
                          const tripHeight = Math.max(8, Math.round((item.trips / maxVal) * 100));
                          const userHeight = Math.max(8, Math.round((item.newUsers / maxVal) * 100));
                          const isHovered = hoveredMonth === idx;

                          return (
                            <div
                              key={idx}
                              onMouseEnter={() => setHoveredMonth(idx)}
                              onMouseLeave={() => setHoveredMonth(null)}
                              className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                            >
                              {/* Hover Tooltip Popup */}
                              {isHovered && (
                                <div className="absolute -top-14 bg-[#241B2F] text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap z-20 pointer-events-none animate-in fade-in zoom-in-95">
                                  <p className="font-bold text-center border-b border-white/20 pb-0.5">
                                    {item.month}
                                  </p>
                                  <p className="text-[#EFA928]">{item.trips} Trips Created</p>
                                  <p className="text-[#2F7A6F]">+{item.newUsers} New Travelers</p>
                                </div>
                              )}

                              {/* Bars Side by Side */}
                              <div className="w-full flex items-end justify-center gap-1.5 h-full">
                                {/* Trips Bar */}
                                <div
                                  style={{ height: `${tripHeight}%` }}
                                  className={`w-3.5 sm:w-5 bg-gradient-to-t from-[#714B67] to-[#8C5D80] rounded-t-md transition-all duration-300 ${
                                    isHovered ? "brightness-125 shadow-md scale-y-105" : ""
                                  }`}
                                />
                                {/* Users Bar */}
                                <div
                                  style={{ height: `${userHeight}%` }}
                                  className={`w-3.5 sm:w-5 bg-gradient-to-t from-[#2F7A6F] to-[#459B8E] rounded-t-md transition-all duration-300 ${
                                    isHovered ? "brightness-125 shadow-md scale-y-105" : ""
                                  }`}
                                />
                              </div>

                              {/* X-Axis Label */}
                              <span
                                className={`text-[11px] font-medium mt-2.5 transition-colors ${
                                  isHovered ? "text-[#714B67] font-bold" : "text-[#5C5468]"
                                }`}
                              >
                                {item.month.split(" ")[0]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-[13px] text-[#5C5468]">
                      No historical trend data available yet.
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E7E0D4] flex items-center justify-between text-[12px] text-[#5C5468]">
                  <span>Telemetry window: Last 6 calendar months</span>
                  <span className={`${ibmPlexMono.className} text-[#714B67] font-semibold`}>
                    Auto-Aggregated
                  </span>
                </div>
              </div>

              {/* Graphical Chart 2: SVG Donut Chart (Trip Status Distribution) */}
              <div className="bg-white rounded-xl border border-[#E7E0D4] p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <PieChartIcon className="w-4 h-4 text-[#714B67]" />
                    <h3 className={`${spaceGrotesk.className} text-[18px] font-bold text-[#241B2F]`}>
                      Trip Status Donut
                    </h3>
                  </div>
                  <p className="text-[13px] text-[#5C5468] mb-4">
                    Live proportional flow of multi-city itineraries
                  </p>

                  {/* SVG Graphical Donut */}
                  <div className="flex flex-col items-center justify-center my-3 relative">
                    <svg width="150" height="150" viewBox="0 0 100 100" className="transform -rotate-90">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#F1EDE6"
                        strokeWidth="14"
                      />
                      {/* Ongoing segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#2F7A6F"
                        strokeWidth="14"
                        strokeDasharray={`${ongoingDash} ${circumference}`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                      {/* Upcoming segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#E0663D"
                        strokeWidth="14"
                        strokeDasharray={`${upcomingDash} ${circumference}`}
                        strokeDashoffset={`-${ongoingDash}`}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                      {/* Completed segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#714B67"
                        strokeWidth="14"
                        strokeDasharray={`${completedDash} ${circumference}`}
                        strokeDashoffset={`-${ongoingDash + upcomingDash}`}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                    </svg>

                    {/* Donut Center Count */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className={`${ibmPlexMono.className} text-[22px] font-bold text-[#241B2F]`}>
                        {analyticsData?.tripStatusDistribution?.total ?? 0}
                      </span>
                      <span className="text-[10px] text-[#5C5468] uppercase font-semibold tracking-wider">
                        Total Trips
                      </span>
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between text-[12px] p-2 rounded-lg bg-[#FAF8F5]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2F7A6F]" />
                        <span className="font-medium text-[#241B2F]">Ongoing</span>
                      </div>
                      <span className={`${ibmPlexMono.className} font-bold text-[#2F7A6F]`}>
                        {analyticsData?.tripStatusDistribution?.ongoing ?? 0} ({ongoingPercent}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[12px] p-2 rounded-lg bg-[#FAF8F5]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#E0663D]" />
                        <span className="font-medium text-[#241B2F]">Upcoming</span>
                      </div>
                      <span className={`${ibmPlexMono.className} font-bold text-[#E0663D]`}>
                        {analyticsData?.tripStatusDistribution?.upcoming ?? 0} ({upcomingPercent}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[12px] p-2 rounded-lg bg-[#FAF8F5]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#714B67]" />
                        <span className="font-medium text-[#241B2F]">Completed</span>
                      </div>
                      <span className={`${ibmPlexMono.className} font-bold text-[#714B67]`}>
                        {analyticsData?.tripStatusDistribution?.completed ?? 0} ({completedPercent}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                GRAPHICAL CHART ROW 2: ACTIVITY CATEGORY BARS + TOP 5 DESTINATIONS BENCHMARK
               ══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Graphical Chart 3: Activity Categories Distribution */}
              <div className="bg-white rounded-xl border border-[#E7E0D4] p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-[#714B67]" />
                    <h3 className={`${spaceGrotesk.className} text-[18px] font-bold text-[#241B2F]`}>
                      Activity Categories Distribution
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#5C5468] bg-[#F1EDE6] px-2 py-0.5 rounded">
                    Popularity Share
                  </span>
                </div>

                <div className="space-y-3.5 pt-2">
                  {popularActivitiesData?.categoryDistribution &&
                  Object.keys(popularActivitiesData.categoryDistribution).length > 0 ? (
                    (() => {
                      const distribution = popularActivitiesData.categoryDistribution as Record<string, number>;
                      const totalCatActs = Object.values(distribution).reduce(
                        (sum: number, val: number) => sum + Number(val || 0),
                        0
                      );

                      return Object.entries(distribution).map(([cat, rawCount], idx) => {
                        const count = Number(rawCount || 0);
                        const catPercent = totalCatActs > 0 ? Math.round((count / totalCatActs) * 100) : 0;

                        const colors = [
                          "from-[#714B67] to-[#8C5D80]",
                          "from-[#2F7A6F] to-[#459B8E]",
                          "from-[#E0663D] to-[#EC8663]",
                          "from-[#EFA928] to-[#F3BE57]",
                          "from-[#241B2F] to-[#4E3347]",
                        ];
                        const barColor = colors[idx % colors.length];

                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between text-[12px]">
                              <span className="font-semibold text-[#241B2F]">{cat}</span>
                              <span className={`${ibmPlexMono.className} text-[#5C5468]`}>
                                {count} scheduled ({catPercent}%)
                              </span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-[#F1EDE6] overflow-hidden">
                              <div
                                style={{ width: `${Math.max(5, catPercent)}%` }}
                                className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div className="py-8 text-center text-[13px] text-[#5C5468]">
                      Loading category distribution...
                    </div>
                  )}
                </div>
              </div>

              {/* Graphical Chart 4: Top 5 Destinations Visual Benchmark */}
              <div className="bg-white rounded-xl border border-[#E7E0D4] p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#714B67]" />
                    <h3 className={`${spaceGrotesk.className} text-[18px] font-bold text-[#241B2F]`}>
                      Top 5 Destinations Benchmark
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#5C5468] bg-[#F1EDE6] px-2 py-0.5 rounded">
                    Itinerary Visits
                  </span>
                </div>

                <div className="space-y-4 pt-2">
                  {popularCities.slice(0, 5).map((city, idx) => {
                    const topVisitCount = popularCities[0]?.tripsVisitedCount || 1;
                    const fillPercent = Math.max(
                      10,
                      Math.round((city.tripsVisitedCount / topVisitCount) * 100)
                    );

                    return (
                      <div key={city.id} className="space-y-1">
                        <div className="flex items-center justify-between text-[12px]">
                          <div className="flex items-center gap-2">
                            <span className={`${ibmPlexMono.className} font-bold text-[#714B67] w-4`}>
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-[#241B2F]">
                              {city.name}, {city.country}
                            </span>
                          </div>
                          <div className={`${ibmPlexMono.className} text-[12px] font-semibold text-[#241B2F]`}>
                            {city.tripsVisitedCount} visits ·{" "}
                            <span className="text-[#714B67]">{city.wishlistCount} saved</span>
                          </div>
                        </div>
                        <div className="w-full h-3 rounded-full bg-[#F1EDE6] overflow-hidden flex">
                          <div
                            style={{ width: `${fillPercent}%` }}
                            className="h-full bg-gradient-to-r from-[#714B67] via-[#2F7A6F] to-[#E0663D] rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 2: POPULAR CITIES (DESTINATIONS)
           ══════════════════════════════════════════════════ */}
        {activeTab === "cities" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className={`${spaceGrotesk.className} text-[20px] font-bold text-[#241B2F]`}>
                  Top Visited & Trending Destinations
                </h2>
                <p className="text-[13px] text-[#5C5468]">
                  Manage official global cities catalog, rankings, and destination imagery.
                </p>
              </div>
              <button
                onClick={handleOpenCreateCity}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#714B67] hover:bg-[#4E3347] text-white text-[13px] font-semibold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Official City</span>
              </button>
            </div>

            {isCitiesLoading ? (
              <div className="py-12 text-center text-[#5C5468]">Loading popular destinations...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {popularCities.map((city, idx) => (
                  <div
                    key={city.id}
                    className="bg-white rounded-xl border border-[#E7E0D4] overflow-hidden shadow-xs hover:border-[#714B67]/40 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image Header */}
                      <div className="relative h-40 w-full bg-[#F1EDE6] overflow-hidden">
                        {city.imageUrl ? (
                          <img
                            src={city.imageUrl}
                            alt={city.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#9A93A6]">
                            <MapPin className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-[#241B2F]/80 backdrop-blur-xs text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-md">
                          #{idx + 1}
                        </div>
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditCity(city)}
                            className="w-7 h-7 rounded-lg bg-white/90 hover:bg-white text-[#714B67] flex items-center justify-center shadow-xs transition-all cursor-pointer"
                            title="Edit City"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: "city", id: city.id, name: city.name })}
                            className="w-7 h-7 rounded-lg bg-white/90 hover:bg-red-50 text-red-600 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                            title="Delete City"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className={`${spaceGrotesk.className} text-[18px] font-bold text-[#241B2F]`}>
                          {city.name}
                        </h3>
                        <p className="text-[13px] text-[#5C5468]">{city.country} {city.region ? `• ${city.region}` : ""}</p>

                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#E7E0D4] text-center">
                          <div className="p-2 rounded-lg bg-[#F1EDE6]">
                            <p className="text-[10px] text-[#5C5468] uppercase font-semibold">Itineraries</p>
                            <p className={`${ibmPlexMono.className} text-[15px] font-bold text-[#241B2F] mt-0.5`}>
                              {city.tripsVisitedCount}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-[#F1EDE6]">
                            <p className="text-[10px] text-[#5C5468] uppercase font-semibold">Wishlisted</p>
                            <p className={`${ibmPlexMono.className} text-[15px] font-bold text-[#714B67] mt-0.5`}>
                              {city.wishlistCount}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-[#F1EDE6]">
                            <p className="text-[10px] text-[#5C5468] uppercase font-semibold">Activities</p>
                            <p className={`${ibmPlexMono.className} text-[15px] font-bold text-[#2F7A6F] mt-0.5`}>
                              {city.activitiesCount}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-2.5 bg-[#FAF8F5] border-t border-[#E7E0D4] flex items-center justify-between text-[12px]">
                      <span className="text-[#5C5468]">Cost Index:</span>
                      <span className={`${ibmPlexMono.className} font-semibold text-[#241B2F]`}>
                        {city.costIndex} / 100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 3: POPULAR ACTIVITIES
           ══════════════════════════════════════════════════ */}
        {activeTab === "activities" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className={`${spaceGrotesk.className} text-[20px] font-bold text-[#241B2F]`}>
                  Popular Activities & Experiences
                </h2>
                <p className="text-[13px] text-[#5C5468]">
                  Manage official activity catalog items for multi-city itinerary planning.
                </p>
              </div>
              <button
                onClick={handleOpenCreateActivity}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#714B67] hover:bg-[#4E3347] text-white text-[13px] font-semibold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Official Activity</span>
              </button>
            </div>

            {isActivitiesLoading ? (
              <div className="py-12 text-center text-[#5C5468]">Loading popular activities...</div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E7E0D4] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#FAF8F5] border-b border-[#E7E0D4] text-[#5C5468] font-semibold">
                      <tr>
                        <th className="py-3 px-4">Activity Name</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Cost</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4 text-center">Scheduled Count</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E0D4]">
                      {popularActivitiesData?.activities?.map((act: AdminPopularActivity, idx: number) => (
                        <tr key={act.id} className="hover:bg-[#FAF8F5] transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#241B2F]">
                            <div className="flex items-center gap-2">
                              <span className={`${ibmPlexMono.className} text-[11px] text-[#9A93A6] w-4`}>
                                #{idx + 1}
                              </span>
                              <span>{act.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#5C5468]">
                            {act.cityName}, {act.country}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1E7EE] text-[#714B67]">
                              {act.category}
                            </span>
                          </td>
                          <td className={`${ibmPlexMono.className} py-3 px-4 font-semibold text-[#241B2F]`}>
                            {formatINR(act.cost)}
                          </td>
                          <td className={`${ibmPlexMono.className} py-3 px-4 text-[#5C5468]`}>
                            {act.durationMin} mins
                          </td>
                          <td className={`${ibmPlexMono.className} py-3 px-4 font-bold text-[#2F7A6F] text-center`}>
                            {act.scheduledCount} times
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditActivity(act)}
                                className="p-1.5 rounded-lg border border-[#E7E0D4] bg-white hover:bg-[#F1EDE6] text-[#714B67] transition-colors cursor-pointer"
                                title="Edit Activity"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ type: "activity", id: act.id, name: act.name })}
                                className="p-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                                title="Delete Activity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 4: MANAGE USERS
           ══════════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {/* Search & Filter bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E7E0D4] shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#9A93A6]" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F1EDE6] text-[13px] text-[#241B2F] placeholder:text-[#9A93A6] border border-transparent focus:border-[#714B67] outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[12px] font-medium text-[#5C5468]">Role Filter:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#F1EDE6] text-[13px] font-medium text-[#241B2F] border border-transparent focus:border-[#714B67] outline-none cursor-pointer"
                >
                  <option value="ALL">All Roles</option>
                  <option value="USER">User (Traveler)</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            {isUsersLoading ? (
              <div className="py-12 text-center text-[#5C5468]">Loading platform users...</div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E7E0D4] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#FAF8F5] border-b border-[#E7E0D4] text-[#5C5468] font-semibold">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4 text-center">Trips</th>
                        <th className="py-3 px-4 text-center">Wishlist</th>
                        <th className="py-3 px-4">Joined Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E0D4]">
                      {usersList.map((user) => (
                        <tr key={user.id} className="hover:bg-[#FAF8F5] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#F1E7EE] border border-[#714B67]/20 flex items-center justify-center font-bold text-[#714B67] text-[13px]">
                                {user.profilePhoto ? (
                                  <img
                                    src={user.profilePhoto}
                                    alt={user.firstName}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  user.firstName?.charAt(0) || "U"
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-[#241B2F] leading-tight">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-[12px] text-[#5C5468]">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                user.role === "ADMIN"
                                  ? "bg-[#714B67] text-white"
                                  : "bg-[#F1EDE6] text-[#5C5468]"
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#5C5468]">
                            {user.city && user.country
                              ? `${user.city}, ${user.country}`
                              : user.country || user.city || "—"}
                          </td>
                          <td className={`${ibmPlexMono.className} py-3.5 px-4 text-center font-bold text-[#241B2F]`}>
                            {user._count?.trips ?? 0}
                          </td>
                          <td className={`${ibmPlexMono.className} py-3.5 px-4 text-center font-semibold text-[#714B67]`}>
                            {user._count?.savedDestinations ?? 0}
                          </td>
                          <td className={`${ibmPlexMono.className} py-3.5 px-4 text-[#5C5468] text-[12px]`}>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleToggleRole(user)}
                              disabled={roleMutation.isPending || user.id === currentUser?.id}
                              className={`text-[12px] font-medium px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
                                user.role === "ADMIN"
                                  ? "border-red-200 text-red-600 hover:bg-red-50"
                                  : "border-[#714B67] text-[#714B67] hover:bg-[#F1E7EE]"
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              {user.role === "ADMIN" ? "Demote to User" : "Promote to Admin"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 5: ALL PLATFORM TRIPS
           ══════════════════════════════════════════════════ */}
        {activeTab === "trips" && (
          <div className="space-y-6">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E7E0D4] shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#9A93A6]" />
                <input
                  type="text"
                  placeholder="Search trip name or owner..."
                  value={tripSearch}
                  onChange={(e) => setTripSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F1EDE6] text-[13px] text-[#241B2F] placeholder:text-[#9A93A6] border border-transparent focus:border-[#714B67] outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[12px] font-medium text-[#5C5468]">Status Filter:</span>
                <select
                  value={tripStatusFilter}
                  onChange={(e) => setTripStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#F1EDE6] text-[13px] font-medium text-[#241B2F] border border-transparent focus:border-[#714B67] outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Trips Grid */}
            {isTripsLoading ? (
              <div className="py-12 text-center text-[#5C5468]">Loading platform trips...</div>
            ) : tripsList.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E7E0D4] p-12 text-center">
                <Compass className="w-10 h-10 text-[#9A93A6] mx-auto mb-3" />
                <p className="text-[16px] font-semibold text-[#241B2F]">No trips matched your search</p>
                <p className="text-[13px] text-[#5C5468] mt-1">Try adjusting your filters or search keywords.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tripsList.map((trip) => (
                  <div
                    key={trip.id}
                    className="bg-white rounded-xl border border-[#E7E0D4] overflow-hidden shadow-xs hover:border-[#714B67] hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Trip Card Header Photo */}
                      <div className="relative h-36 w-full bg-[#F1EDE6] overflow-hidden">
                        {trip.coverPhoto ? (
                          <img
                            src={trip.coverPhoto}
                            alt={trip.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#9A93A6]">
                            <Compass className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-[#241B2F] text-[11px] font-semibold px-2 py-0.5 rounded-md">
                          {trip.isPublic ? "Public" : "Private"}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className={`${spaceGrotesk.className} text-[17px] font-bold text-[#241B2F] line-clamp-1`}>
                          {trip.name}
                        </h3>

                        <div className="flex items-center gap-2 text-[12px] text-[#5C5468] mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className={ibmPlexMono.className}>
                            {new Date(trip.startDate).toLocaleDateString()} —{" "}
                            {new Date(trip.endDate).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Owner Badge */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E7E0D4]">
                          <div className="w-6 h-6 rounded-full bg-[#F1E7EE] text-[#714B67] text-[11px] font-bold flex items-center justify-center">
                            {trip.user?.firstName?.charAt(0) || "U"}
                          </div>
                          <span className="text-[12px] text-[#5C5468]">
                            Created by{" "}
                            <span className="font-semibold text-[#241B2F]">
                              {trip.user?.firstName} {trip.user?.lastName}
                            </span>
                          </span>
                        </div>

                        {/* Cities tags */}
                        {trip.cities?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {trip.cities.slice(0, 3).map((city, cIdx) => (
                              <span
                                key={cIdx}
                                className="text-[11px] font-medium bg-[#FAF8F5] border border-[#E7E0D4] px-2 py-0.5 rounded-md text-[#5C5468]"
                              >
                                📍 {city}
                              </span>
                            ))}
                            {trip.cities.length > 3 && (
                              <span className="text-[11px] text-[#9A93A6] py-0.5">
                                +{trip.cities.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom stats footer */}
                    <div className="px-4 py-3 bg-[#FAF8F5] border-t border-[#E7E0D4] flex items-center justify-between">
                      <div className="text-[12px] text-[#5C5468]">
                        Stops:{" "}
                        <span className={`${ibmPlexMono.className} font-bold text-[#241B2F]`}>
                          {trip.stopsCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`${ibmPlexMono.className} text-[13px] font-bold text-[#2F7A6F]`}>
                          ${trip.totalExpense.toFixed(2)}
                        </div>
                        <button
                          onClick={() => setDeleteConfirm({ type: "trip", id: trip.id, name: trip.name })}
                          className="p-1 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                          title="Delete / Moderate Trip"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════
          CITY CREATE / EDIT MODAL
         ══════════════════════════════════════════════════ */}
      {isCityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E7E0D4] shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E7E0D4] flex items-center justify-between bg-[#FAF8F5]">
              <h3 className={`${spaceGrotesk.className} text-[18px] font-bold text-[#241B2F]`}>
                {editingCity ? "Edit Official City" : "Add New Official City"}
              </h3>
              <button
                onClick={() => setIsCityModalOpen(false)}
                className="p-1 rounded-lg text-[#9A93A6] hover:text-[#241B2F] hover:bg-[#F1EDE6] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                citySaveMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                  City Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paris"
                  value={cityFormData.name}
                  onChange={(e) => setCityFormData({ ...cityFormData, name: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                    Country *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. France"
                    value={cityFormData.country}
                    onChange={(e) => setCityFormData({ ...cityFormData, country: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Europe"
                    value={cityFormData.region}
                    onChange={(e) => setCityFormData({ ...cityFormData, region: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                    Cost Index (0-100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={cityFormData.costIndex}
                    onChange={(e) => setCityFormData({ ...cityFormData, costIndex: Number(e.target.value) })}
                    className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                    Popularity Score
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cityFormData.popularity}
                    onChange={(e) => setCityFormData({ ...cityFormData, popularity: Number(e.target.value) })}
                    className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                  City Image (Upload File or URL)
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCityImageFile(e.target.files[0]);
                      }
                    }}
                    className="block w-full text-[12px] text-[#5C5468] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[12px] file:font-semibold file:bg-[#F1E7EE] file:text-[#714B67] hover:file:bg-[#E7D6E2]"
                  />
                  <input
                    type="url"
                    placeholder="Or enter image URL (https://...)"
                    value={cityFormData.imageUrl}
                    onChange={(e) => setCityFormData({ ...cityFormData, imageUrl: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E7E0D4] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCityModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E7E0D4] text-[13px] font-medium text-[#5C5468] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={citySaveMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-[#714B67] hover:bg-[#4E3347] text-white text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {citySaveMutation.isPending ? "Saving..." : editingCity ? "Save Changes" : "Create City"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ACTIVITY CREATE / EDIT MODAL
         ══════════════════════════════════════════════════ */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E7E0D4] shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E7E0D4] flex items-center justify-between bg-[#FAF8F5]">
              <h3 className={`${spaceGrotesk.className} text-[18px] font-bold text-[#241B2F]`}>
                {editingActivity ? "Edit Official Activity" : "Add New Official Activity"}
              </h3>
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="p-1 rounded-lg text-[#9A93A6] hover:text-[#241B2F] hover:bg-[#F1EDE6] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                activitySaveMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              {!editingActivity && (
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                    Target City *
                  </label>
                  <select
                    required
                    value={activityFormData.cityId}
                    onChange={(e) => setActivityFormData({ ...activityFormData, cityId: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67] cursor-pointer"
                  >
                    <option value="" disabled>Select a city</option>
                    {popularCities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}, {city.country}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                  Activity Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eiffel Tower Guided Tour"
                  value={activityFormData.name}
                  onChange={(e) => setActivityFormData({ ...activityFormData, name: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={activityFormData.category}
                    onChange={(e) => setActivityFormData({ ...activityFormData, category: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67] cursor-pointer"
                  >
                    <option value="SIGHTSEEING">SIGHTSEEING</option>
                    <option value="FOOD">FOOD</option>
                    <option value="CULTURE">CULTURE</option>
                    <option value="ADVENTURE">ADVENTURE</option>
                    <option value="RELAXATION">RELAXATION</option>
                    <option value="SHOPPING">SHOPPING</option>
                    <option value="NIGHTLIFE">NIGHTLIFE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                    Cost (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={activityFormData.cost}
                    onChange={(e) => setActivityFormData({ ...activityFormData, cost: Number(e.target.value) })}
                    className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                    Duration (mins) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={activityFormData.durationMin}
                    onChange={(e) => setActivityFormData({ ...activityFormData, durationMin: Number(e.target.value) })}
                    className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description of the activity..."
                  value={activityFormData.description}
                  onChange={(e) => setActivityFormData({ ...activityFormData, description: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67] resize-none"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1">
                  Activity Image (Upload File or URL)
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setActivityImageFile(e.target.files[0]);
                      }
                    }}
                    className="block w-full text-[12px] text-[#5C5468] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[12px] file:font-semibold file:bg-[#F1E7EE] file:text-[#714B67] hover:file:bg-[#E7D6E2]"
                  />
                  <input
                    type="url"
                    placeholder="Or enter image URL (https://...)"
                    value={activityFormData.imageUrl}
                    onChange={(e) => setActivityFormData({ ...activityFormData, imageUrl: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 text-[13.5px] text-[#241B2F] outline-none focus:border-[#714B67]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E7E0D4] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E7E0D4] text-[13px] font-medium text-[#5C5468] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activitySaveMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-[#714B67] hover:bg-[#4E3347] text-white text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {activitySaveMutation.isPending ? "Saving..." : editingActivity ? "Save Changes" : "Create Activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
         ══════════════════════════════════════════════════ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E7E0D4] shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className={`${spaceGrotesk.className} text-[18px] font-bold text-[#241B2F]`}>
              Confirm Deletion
            </h3>
            <p className="text-[13px] text-[#5C5468] mt-2">
              Are you sure you want to delete <span className="font-semibold text-[#241B2F]">"{deleteConfirm.name}"</span>? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-[#E7E0D4] text-[13px] font-medium text-[#5C5468] hover:bg-[#FAF8F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={cityDeleteMutation.isPending || activityDeleteMutation.isPending || tripDeleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

