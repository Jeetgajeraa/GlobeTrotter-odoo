import { AxiosError } from "axios";
import { apiClient } from ".";
import { BASE_URL, BaseResponse } from "../constants";

/**
 * DELETE /api/stops/:stopId
 * Removes a stop and its associated activities from a trip.
 */
export async function deleteStop(stopId: string): Promise<BaseResponse> {
  try {
    const { data } = await apiClient.delete<BaseResponse>(
      `${BASE_URL}/api/stops/${stopId}`,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as BaseResponse;
  }
}

/**
 * DELETE /api/stop-activities/:id
 * Removes a scheduled activity from a stop.
 */
export async function deleteStopActivity(
  stopActivityId: string,
): Promise<BaseResponse> {
  try {
    const { data } = await apiClient.delete<BaseResponse>(
      `${BASE_URL}/api/stop-activities/${stopActivityId}`,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as BaseResponse;
  }
}
