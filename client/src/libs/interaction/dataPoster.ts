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

export async function registerUser(payload: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  password: string;
  confirmPassword: string;
  additionalInfo?: string;
}): Promise<RegisterResponse> {
  try {
    const { data } = await apiClient.post<RegisterResponse>(
      `${BASE_URL}/api/auth/register`,
      payload,
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

