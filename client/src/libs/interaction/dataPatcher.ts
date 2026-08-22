import { AxiosError } from "axios";
import { apiClient } from ".";
import { BASE_URL } from "../constants";
import {
  UpdateProfilePayload,
  UpdateProfileResponse,
  StopResponse,
  StopsResponse,
  StopActivityResponse,
} from "../types";

/**
 * PATCH /api/auth/me
 * Updates the authenticated user's profile.
 */
export async function patchMe(
  payload: UpdateProfilePayload,
): Promise<UpdateProfileResponse> {
  try {
    const { profilePhoto, ...rest } = payload;

    let body: FormData | Record<string, unknown>;
    let headers: Record<string, string> = {};

    if (profilePhoto instanceof File) {
      const form = new FormData();
      form.append("profilePhoto", profilePhoto);
      (Object.keys(rest) as Array<keyof typeof rest>).forEach((key) => {
        const val = rest[key];
        if (val !== undefined && val !== null) {
          form.append(key, String(val));
        }
      });
      body = form;
      headers["Content-Type"] = "multipart/form-data";
    } else {
      body = rest as Record<string, unknown>;
    }

    const { data } = await apiClient.patch<UpdateProfileResponse>(
      `${BASE_URL}/api/auth/me`,
      body,
      { headers },
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as UpdateProfileResponse;
  }
}

/**
 * PATCH /api/stops/:stopId
 * Updates stop dates or city.
 */
export async function updateStop(
  stopId: string,
  payload: { startDate?: string; endDate?: string; cityId?: string; order?: number },
): Promise<StopResponse> {
  try {
    const { data } = await apiClient.patch<StopResponse>(
      `${BASE_URL}/api/stops/${stopId}`,
      payload,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as StopResponse;
  }
}

/**
 * PATCH /api/trips/:tripId/stops/reorder
 * Bulk reorder stops for a trip.
 */
export async function reorderStops(
  tripId: string,
  stops: Array<{ stopId: string; order: number }>,
): Promise<StopsResponse> {
  try {
    const { data } = await apiClient.patch<StopsResponse>(
      `${BASE_URL}/api/trips/${tripId}/stops/reorder`,
      { stops },
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as StopsResponse;
  }
}

/**
 * PATCH /api/stop-activities/:id
 * Updates scheduled activity details (date, time, costOverride, order).
 */
export async function updateStopActivity(
  activityId: string,
  payload: {
    scheduledDate?: string;
    startTime?: string;
    costOverride?: number;
    order?: number;
  },
): Promise<StopActivityResponse> {
  try {
    const { data } = await apiClient.patch<StopActivityResponse>(
      `${BASE_URL}/api/stop-activities/${activityId}`,
      payload,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as StopActivityResponse;
  }
}

/**
 * PATCH /api/admin/users/:id/role
 * Promotes a user to ADMIN or changes role to USER
 */
export async function updateAdminUserRole(
  userId: string,
  role: "USER" | "ADMIN",
) {
  try {
    const { data } = await apiClient.patch(`${BASE_URL}/api/admin/users/${userId}/role`, {
      role,
    });
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as any;
  }
}


