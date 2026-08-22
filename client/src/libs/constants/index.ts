export const BASE_URL: Readonly<string> =
  process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:8008";

export interface BaseResponse {
  success: boolean;
  message: string;
}

export interface LoginResponse extends BaseResponse {
  data: {
    token: string;
  };
}

export interface RegisterResponse extends BaseResponse {
  data?: {
    token: string;
  };
}