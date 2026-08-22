import { AxiosError } from "axios";
import { apiClient } from ".";
import { BASE_URL } from "../constants";
import {
  UserProfileResponse,
  GroupedTripsResponse,
  TripsListResponse,
  GetTripsParams, CommunityPostsResponse,
  SingleCommunityPostResponse,
  GetCommunityPostsParams,
} from "../types";
import {
  GetTripResponse,
  CitiesResponse,
  ActivitiesResponse,
} from "../types";
/**
 * GET /api/auth/me
 * Fetches the currently authenticated user's profile.
 * The Bearer token is automatically attached by the apiClient interceptor.
 */
export async function getMe(): Promise<UserProfileResponse> {
  try {
    const { data } = await apiClient.get<UserProfileResponse>(
      `${BASE_URL}/api/auth/me`,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as UserProfileResponse;
  }
}

/**
 * GET /api/trips
 * Fetches all trips for the authenticated user.
 * Pass groupByStatus=true to get the { ongoing, upcoming, completed } shape (Screen 6).
 */
export async function getUserTrips(
  params: GetTripsParams & { groupByStatus: true },
): Promise<GroupedTripsResponse>;
export async function getUserTrips(
  params?: GetTripsParams & { groupByStatus?: false },
): Promise<TripsListResponse>;
export async function getUserTrips(
  params: GetTripsParams = {},
): Promise<GroupedTripsResponse | TripsListResponse> {
  try {
    const query: Record<string, string> = {};
    if (params.search) query.search = params.search;
    if (params.status) query.status = params.status;
    if (params.sortBy) query.sortBy = params.sortBy;
    if (params.sortOrder) query.sortOrder = params.sortOrder;
    if (params.groupByStatus) query.groupByStatus = "true";

    const { data } = await apiClient.get<GroupedTripsResponse | TripsListResponse>(
      `${BASE_URL}/api/trips`,
      { params: query },
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as TripsListResponse;
  }
}

/**
 * GET /api/trips/:id
 * Fetches full trip details including stops, day-wise activities, and expenses.
 */
export async function getTripById(tripId: string): Promise<GetTripResponse> {
  try {
    const { data } = await apiClient.get<GetTripResponse>(
      `${BASE_URL}/api/trips/${tripId}`,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as GetTripResponse;
  }
}

/**
 * GET /api/cities
 * Search or list cities with costIndex and popularity.
 */
export async function getCities(search?: string): Promise<CitiesResponse> {
  try {
    const { data } = await apiClient.get<CitiesResponse>(
      `${BASE_URL}/api/cities`,
      { params: search ? { search } : undefined },
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as CitiesResponse;
  }
}

/**
 * GET /api/activities
 * Filter activities by city or category.
 */
export async function getActivities(params?: {
  cityId?: string;
  category?: string;
  search?: string;
}): Promise<ActivitiesResponse> {
  try {
    const { data } = await apiClient.get<ActivitiesResponse>(
      `${BASE_URL}/api/activities`,
      { params },
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as ActivitiesResponse;
  }
}

/**
 * ──────────────────────────────────────────────
 * CALENDAR & TIMELINE GETTERS (Screen 11)
 * ──────────────────────────────────────────────
 */

export async function getUserCalendar(params: { year?: number; month?: number } = {}) {
  try {
    const { data } = await apiClient.get(`${BASE_URL}/api/calendar`, {
      params,
    });
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as any;
  }
}

export async function getTripTimeline(tripId: string) {
  try {
    const { data } = await apiClient.get(`${BASE_URL}/api/trips/${tripId}/calendar`);
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as any;
  }
}

/**
 * ──────────────────────────────────────────────
 * ADMIN GETTERS (Screen 12)
 * ──────────────────────────────────────────────
 */


export async function getAdminAnalytics() {
  try {
    const { data } = await apiClient.get(`${BASE_URL}/api/admin/analytics`);
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as any;
  }
}

export async function getAdminPopularDestinations(limit: number = 10) {
  try {
    const { data } = await apiClient.get(`${BASE_URL}/api/admin/destinations/popular`, {
      params: { limit },
    });
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as any;
  }
}

export async function getAdminPopularActivities(limit: number = 10) {
  try {
    const { data } = await apiClient.get(`${BASE_URL}/api/admin/activities/popular`, {
      params: { limit },
    });
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as any;
  }
}

export async function getAdminUsers(params: {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
} = {}) {
  try {
    const { data } = await apiClient.get(`${BASE_URL}/api/admin/users`, {
      params,
    });
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as any;
  }
}

export async function getAdminAllTrips(params: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  try {
    const { data } = await apiClient.get(`${BASE_URL}/api/admin/trips`, {
      params,
    });
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as any;
  }
}


/**
 * GET /api/community/posts
 * Fetch community feed posts with searching, sorting, and filtering.
 */
export async function getCommunityPosts(
  params?: GetCommunityPostsParams,
): Promise<CommunityPostsResponse> {
  try {
    const query: Record<string, string> = {};
    if (params?.search) query.search = params.search;
    if (params?.tripId) query.tripId = params.tripId;
    if (params?.userId) query.userId = params.userId;
    if (params?.hasImage !== undefined) query.hasImage = String(params.hasImage);
    if (params?.hasTrip !== undefined) query.hasTrip = String(params.hasTrip);
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.page) query.page = String(params.page);
    if (params?.limit) query.limit = String(params.limit);

    const { data } = await apiClient.get<CommunityPostsResponse>(
      `${BASE_URL}/api/community/posts`,
      { params: query },
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as CommunityPostsResponse;
  }
}

/**
 * GET /api/community/posts/:id
 * Fetch single community post by ID.
 */
export async function getCommunityPostById(
  id: string,
): Promise<SingleCommunityPostResponse> {
  try {
    const { data } = await apiClient.get<SingleCommunityPostResponse>(
      `${BASE_URL}/api/community/posts/${id}`,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as SingleCommunityPostResponse;
  }
}
