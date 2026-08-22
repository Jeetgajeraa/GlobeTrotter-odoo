import { AxiosError } from "axios";
import { apiClient } from ".";
import { BASE_URL, LoginResponse, RegisterResponse } from "../constants";
import { CreateTripPayload, CreateTripResponse } from "../types";

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