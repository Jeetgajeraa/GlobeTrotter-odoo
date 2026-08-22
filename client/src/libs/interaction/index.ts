import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import  cookies  from "js-cookie";
import { BASE_URL } from "../constants";


export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically add Bearer token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = cookies.get("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Global response handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      cookies.remove("token");
    }

    return Promise.reject(error);
  },
);