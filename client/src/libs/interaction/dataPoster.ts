import { AxiosError } from "axios";
import { apiPost } from ".";
import { BASE_URL, LoginResponse } from "../constants";

export async function loginTPO(credentials: {
  username: string;
  password: string;
}): Promise<LoginResponse> {
  try {
    const { data } = await apiPost<LoginResponse>(
      `${BASE_URL}/centraltpo/login`,
      credentials,
    );
    return data;
  } catch (error: AxiosError | unknown) {
    const err = error as AxiosError;
    return err.response?.data as LoginResponse;
  }
}