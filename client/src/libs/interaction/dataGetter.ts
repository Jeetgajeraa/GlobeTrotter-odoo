import { AxiosError } from "axios";
import { apiClient } from ".";
import { BASE_URL } from "../constants";
import {
  UserProfileResponse,
  GroupedTripsResponse,
  TripsListResponse,
  GetTripsParams,
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
    if (params.search)        query.search        = params.search;
    if (params.status)        query.status        = params.status;
    if (params.sortBy)        query.sortBy        = params.sortBy;
    if (params.sortOrder)     query.sortOrder     = params.sortOrder;
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
