import { AxiosError } from "axios";
import { apiClient } from ".";
import { BASE_URL } from "../constants";
import { UpdateProfilePayload, UpdateProfileResponse } from "../types";

/**
 * PATCH /api/auth/me
 * Updates the authenticated user's profile.
 * Sends multipart/form-data when a profilePhoto File is provided,
 * otherwise sends JSON — the server's uploadProfilePhoto middleware
 * handles both cases.
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
      // Append text fields only when they have a value
      (Object.keys(rest) as Array<keyof typeof rest>).forEach((key) => {
        const val = rest[key];
        if (val !== undefined && val !== null) {
          form.append(key, String(val));
        }
      });
      body = form;
      // Let the browser set Content-Type with the correct boundary
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
