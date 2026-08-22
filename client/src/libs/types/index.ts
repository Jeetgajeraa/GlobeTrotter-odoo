import { BaseResponse } from "../constants";

/* ──────────────────────────────────────────────
   User model (mirrors Prisma schema, no passwordHash)
   ────────────────────────────────────────────── */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  profilePhoto: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
}

/* ──────────────────────────────────────────────
   GET /api/auth/me  →  { success, message, data: { user } }
   ────────────────────────────────────────────── */
export interface UserProfileResponse extends BaseResponse {
  data: {
    user: User;
  } | null;
}

/* ──────────────────────────────────────────────
   PATCH /api/auth/me  →  same shape
   ────────────────────────────────────────────── */
export interface UpdateProfileResponse extends BaseResponse {
  data: {
    user: User;
  } | null;
}

/* ──────────────────────────────────────────────
   PATCH payload fields (all optional)
   ────────────────────────────────────────────── */
export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  city?: string;
  country?: string;
  bio?: string;
  password?: string;
  profilePhoto?: File | null;
}

/* ──────────────────────────────────────────────
   Trip shapes (lightweight — for profile cards)
   ────────────────────────────────────────────── */
export interface TripSummary {
  id: string;
  name: string;
  description: string | null;
  coverPhoto: string | null;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  createdAt: string;
}

export interface CreateTripPayload {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  coverPhoto?: string | File | null;
  isPublic?: boolean;
  initialCityId?: string;
}

export interface CreateTripResponse extends BaseResponse {
  data: TripSummary & {
      shareSlug?: string | null;
      _count?: {
        stops: number;
        expenses: number;
      };
    };
}

/* ──────────────────────────────────────────────
   Full Trip — returned by GET /api/trips
   (mirrors trip.controller getTripStatus + includes)
   ────────────────────────────────────────────── */
export type TripStatus = "ongoing" | "upcoming" | "completed";

export interface TripStop {
  id: string;
  tripId: string;
  cityId: string;
  startDate: string;
  endDate: string;
  order: number;
  city: {
    id: string;
    name: string;
    country: string;
    imageUrl: string | null;
  };
  _count: { stopActivities: number };
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverPhoto: string | null;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  shareSlug: string | null;
  createdAt: string;
  updatedAt: string;
  status: TripStatus;
  totalExpense: number;
  stops: TripStop[];
  _count: {
    stops: number;
    expenses: number;
    communityPosts: number;
  };
}

/* ──────────────────────────────────────────────
   GET /api/trips  (flat list)
   ────────────────────────────────────────────── */
export interface TripsListResponse extends BaseResponse {
  data: Trip[] | null;
}

/* ──────────────────────────────────────────────
   GET /api/trips?groupByStatus=true  (Screen 6)
   ────────────────────────────────────────────── */
export interface GroupedTripsResponse extends BaseResponse {
  data: {
    ongoing:   Trip[];
    upcoming:  Trip[];
    completed: Trip[];
    total:     number;
  } | null;
}

/* ──────────────────────────────────────────────
   GET /api/trips  query params
   ────────────────────────────────────────────── */
export interface GetTripsParams {
  search?:        string;
  status?:        TripStatus | "all";
  sortBy?:        "startDate" | "endDate" | "name" | "createdAt";
  sortOrder?:     "asc" | "desc";
  groupByStatus?: boolean;
}


/* ──────────────────────────────────────────────
   City & Activity Models (mirrors Prisma schema)
   ────────────────────────────────────────────── */
export interface City {
  id: string;
  name: string;
  country: string;
  region?: string | null;
  costIndex: number;
  popularity: number;
  imageUrl?: string | null;
}

export type ActivityCategory =
  | "SIGHTSEEING"
  | "FOOD"
  | "ADVENTURE"
  | "CULTURE"
  | "NIGHTLIFE"
  | "RELAXATION"
  | "SHOPPING"
  | "TRANSPORT"
  | "OTHER";

export interface Activity {
  id: string;
  cityId: string;
  name: string;
  description?: string | null;
  category: ActivityCategory;
  cost: number;
  durationMin: number;
  imageUrl?: string | null;
}

export interface StopActivity {
  id: string;
  stopId: string;
  activityId: string;
  scheduledDate: string;
  startTime?: string | null;
  order: number;
  costOverride?: number | null;
  activity: Activity;
}

export interface StopExpense {
  id: string;
  tripId: string;
  stopId?: string | null;
  category: string;
  amount: number;
  date: string;
  description?: string | null;
}

export interface Stop {
  id: string;
  tripId: string;
  cityId: string;
  startDate: string;
  endDate: string;
  order: number;
  city: City;
  stopActivities: StopActivity[];
  expenses?: StopExpense[];
}

export interface DetailedTrip extends TripSummary {
  shareSlug?: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePhoto?: string | null;
  };
  stops: Stop[];
  expenses: StopExpense[];
  totalExpense?: number;
  status?: "ongoing" | "upcoming" | "completed";
}

/* ──────────────────────────────────────────────
   Itinerary API Responses & Payloads
   ────────────────────────────────────────────── */
export interface GetTripResponse extends BaseResponse {
  data: DetailedTrip | null;
}

export interface CitiesResponse extends BaseResponse {
  data:
    | City[]
    | {
        cities: City[];
        pagination?: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }
    | null;
}

export interface ActivitiesResponse extends BaseResponse {
  data:
    | Activity[]
    | {
        activities: Activity[];
        pagination?: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }
    | null;
}

export interface AddStopPayload {
  cityId: string;
  startDate: string;
  endDate: string;
  order?: number;
}

export interface StopResponse extends BaseResponse {
  data: Stop | null;
}

export interface StopsResponse extends BaseResponse {
  data: Stop[] | null;
}

export interface AddStopActivityPayload {
  activityId?: string;
  customName?: string;
  category?: ActivityCategory;
  cost?: number;
  durationMin?: number;
  scheduledDate: string;
  startTime?: string;
  order?: number;
  costOverride?: number;
}

export interface StopActivityResponse extends BaseResponse {
  data: StopActivity | null;
}

/* ──────────────────────────────────────────────
   Admin Panel (Screen 12) Types
   ────────────────────────────────────────────── */
export interface AdminAnalyticsData {
  summary: {
    totalUsers: number;
    totalTrips: number;
    totalStops: number;
    totalStopActivities: number;
    totalExpensesCount: number;
    totalPlatformSpend: number;
    totalCommunityPosts: number;
    totalCities: number;
    totalActivities: number;
  };
  tripStatusDistribution: {
    ongoing: number;
    upcoming: number;
    completed: number;
    total: number;
  };
  monthlyTrends: Array<{
    month: string;
    trips: number;
    newUsers: number;
  }>;
}

export interface AdminAnalyticsResponse extends BaseResponse {
  data: AdminAnalyticsData | null;
}

export interface AdminPopularDestination {
  id: string;
  name: string;
  country: string;
  region: string | null;
  costIndex: number;
  popularity: number;
  imageUrl: string | null;
  tripsVisitedCount: number;
  wishlistCount: number;
  activitiesCount: number;
  totalSpend: number;
}

export interface AdminPopularDestinationsResponse extends BaseResponse {
  data: AdminPopularDestination[] | null;
}

export interface AdminPopularActivity {
  id: string;
  name: string;
  category: ActivityCategory;
  cost: number;
  durationMin: number;
  imageUrl: string | null;
  cityName: string;
  country: string;
  scheduledCount: number;
}

export interface AdminPopularActivitiesResponse extends BaseResponse {
  data: {
    activities: AdminPopularActivity[];
    categoryDistribution: Record<string, number>;
  } | null;
}

export interface AdminUserListItem extends User {
  _count: {
    trips: number;
    savedDestinations: number;
    communityPosts: number;
  };
}

export interface AdminUsersResponse extends BaseResponse {
  data: {
    users: AdminUserListItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  } | null;
}

export interface AdminPlatformTrip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  coverPhoto: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePhoto: string | null;
  };
  stopsCount: number;
  cities: string[];
  totalExpense: number;
}

export interface AdminAllTripsResponse extends BaseResponse {
  data: {
    trips: AdminPlatformTrip[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  } | null;
}

/* ──────────────────────────────────────────────
   Budget & Expense Shapes (Screen 9)
   ────────────────────────────────────────────── */
export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}
export interface DailyExpenseItem {
  id: string;
  category: string;
  amount: number;
  description?: string | null;
  cityName?: string | null;
}
export interface DailyExpenseGroup {
  date: string;
  total: number;
  items: DailyExpenseItem[];
}
export interface StopBudgetBreakdown {
  stopId: string;
  cityName: string;
  country: string;
  order: number;
  startDate: string;
  endDate: string;
  totalExpenses: number;
  estimatedActivitiesCost: number;
}
export interface ScheduledActivityBudget {
  stopActivityId: string;
  activityName: string;
  cityName: string;
  scheduledDate: string;
  cost: number;
}
export interface TripBudgetSummaryData {
  tripId: string;
  tripName: string;
  durationDays: number;
  totalLoggedExpense: number;
  totalEstimatedActivitiesCost: number;
  averageCostPerDay: number;
  categoryBreakdown: CategoryBreakdownItem[];
  dailyExpenses: DailyExpenseGroup[];
  stopBreakdown: StopBudgetBreakdown[];
  scheduledActivitiesList: ScheduledActivityBudget[];
}
export interface TripBudgetSummaryResponse extends BaseResponse {
  data: TripBudgetSummaryData | null;
}
export interface AddExpensePayload {
  stopId?: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
}


/* ──────────────────────────────────────────────
   Community Post Types
   ────────────────────────────────────────────── */
export interface CommunityAuthor {
  id: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface CommunityTripSummary {
  id: string;
  name: string;
  coverPhoto?: string | null;
  shareSlug?: string | null;
  isPublic?: boolean;
}

export interface CommunityPost {
  id: string;
  userId: string;
  tripId?: string | null;
  title: string;
  content: string;
  imageUrl?: string | null;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  user: CommunityAuthor;
  trip?: CommunityTripSummary | null;
}

export interface CommunityPostsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CommunityPostsResponse extends BaseResponse {
  data: {
    posts: CommunityPost[];
    pagination: CommunityPostsPagination;
  } | null;
}

export interface SingleCommunityPostResponse extends BaseResponse {
  data: CommunityPost | null;
}

export interface LikePostResponse extends BaseResponse {
  data: {
    id: string;
    likeCount: number;
  } | null;
}

export interface GetCommunityPostsParams {
  search?: string;
  tripId?: string;
  userId?: string;
  hasImage?: boolean;
  hasTrip?: boolean;
  sortBy?: "createdAt" | "updatedAt" | "likeCount" | "title";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export type GroupByOption = "none" | "user" | "date";
export type SortByOption = "createdAt" | "likeCount" | "updatedAt" | "title";
export type PostTypeFilter = "all" | "images" | "trips";
export type AuthorFilter = "all" | "me";
export type DateRangeFilter = "all" | "today" | "week" | "month";
