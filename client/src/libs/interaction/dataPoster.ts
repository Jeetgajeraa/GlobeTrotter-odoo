import { AxiosError } from "axios";
import { apiClient } from ".";
import { BASE_URL, LoginResponse, RegisterResponse } from "../constants";
import {
  CreateTripPayload,
  CreateTripResponse,
  AddStopPayload,
  StopResponse,
  AddStopActivityPayload,
  StopActivityResponse,
  SingleCommunityPostResponse,
  LikePostResponse,
  AddExpensePayload,
} from "../types";

export async function login(credentials: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post<LoginResponse>(
      `${BASE_URL}/api/auth/login`,
      credentials,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as LoginResponse;
  }
}

export async function registerUser(
  payload:
    | {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        phoneNumber?: string;
        city?: string;
        country?: string;
        password: string;
        confirmPassword?: string;
        additionalInfo?: string;
        bio?: string;
        profilePhoto?: File | string | null;
      }
    | FormData,
): Promise<RegisterResponse> {
  try {
    const isFormData = payload instanceof FormData;
    const { data } = await apiClient.post<RegisterResponse>(
      `${BASE_URL}/api/auth/register`,
      payload,
      isFormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as RegisterResponse;
  }
}

export async function createTrip(
  payload: CreateTripPayload | FormData,
): Promise<CreateTripResponse> {
  try {
    const isFormData = payload instanceof FormData;
    const { data } = await apiClient.post<CreateTripResponse>(
      `${BASE_URL}/api/trips`,
      payload,
      isFormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as CreateTripResponse;
  }
}

/**
 * POST /api/trips/:tripId/stops
 * Adds a new stop/city to a trip.
 */
export async function addStop(
  tripId: string,
  payload: AddStopPayload,
): Promise<StopResponse> {
  try {
    const { data } = await apiClient.post<StopResponse>(
      `${BASE_URL}/api/trips/${tripId}/stops`,
      payload,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as StopResponse;
  }
}

/**
 * POST /api/stops/:stopId/activities
 * Assigns an activity to a specific day within a stop.
 */
export async function addStopActivity(
  stopId: string,
  payload: AddStopActivityPayload,
): Promise<StopActivityResponse> {
  try {
    const { data } = await apiClient.post<StopActivityResponse>(
      `${BASE_URL}/api/stops/${stopId}/activities`,
      payload,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as StopActivityResponse;
  }
}

/**
 * POST /api/trips/:tripId/expenses
 * Adds an expense item to a trip.
 */
export async function addTripExpense(
  tripId: string,
  payload: AddExpensePayload,
) {
  try {
    const { data } = await apiClient.post(
      `${BASE_URL}/api/trips/${tripId}/expenses`,
      payload,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as any;
  }
}
/**
 * POST /api/community/posts
 * Creates a new community post (supports FormData with file upload)
 */
export async function createCommunityPost(
  payload: FormData,
): Promise<SingleCommunityPostResponse> {
  try {
    const { data } = await apiClient.post<SingleCommunityPostResponse>(
      `${BASE_URL}/api/community/posts`,
      payload,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as SingleCommunityPostResponse;
  }
}

/**
 * POST /api/community/posts/:id/like
 * Increment likes on a community post
 */
export async function likeCommunityPost(
  id: string,
): Promise<LikePostResponse> {
  try {
    const { data } = await apiClient.post<LikePostResponse>(
      `${BASE_URL}/api/community/posts/${id}/like`,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as LikePostResponse;
  }
}

/**
 * POST /api/community/posts/:id/unlike
 * Decrement likes on a community post
 */
export async function unlikeCommunityPost(
  id: string,
): Promise<LikePostResponse> {
  try {
    const { data } = await apiClient.post<LikePostResponse>(
      `${BASE_URL}/api/community/posts/${id}/unlike`,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as LikePostResponse;
  }
}

/**
 * POST /api/cities
 * Creates a new official city (Admin only)
 */
export async function createCity(
  payload: FormData | Record<string, any>,
) {
  try {
    const isFormData = payload instanceof FormData;
    const { data } = await apiClient.post(
      `${BASE_URL}/api/cities`,
      payload,
      isFormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as any;
  }
}

/**
 * POST /api/activities
 * Creates a new official activity (Admin only)
 */
export async function createActivity(
  payload: FormData | Record<string, any>,
) {
  try {
    const isFormData = payload instanceof FormData;
    const { data } = await apiClient.post(
      `${BASE_URL}/api/activities`,
      payload,
      isFormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as any;
  }
}


