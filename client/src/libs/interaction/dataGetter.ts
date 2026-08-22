import { AxiosError } from "axios";
import { apiClient } from ".";
import { BASE_URL } from "../constants";
import { UserProfileResponse } from "../types";

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
