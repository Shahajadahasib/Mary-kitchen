/**
 * Axios API client with JWT refresh token handling.
 */
import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Routes that require authentication — redirect to login if session expires
const PROTECTED_ROUTES = ["/cart", "/checkout", "/orders", "/profile", "/admin"];

const handleSessionExpired = () => {
  if (typeof window === "undefined") return;

  // Clear tokens
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");

  // Clear auth from localStorage
  localStorage.removeItem("auth-storage");

  const currentPath = window.location.pathname;
  const isProtected = PROTECTED_ROUTES.some(route => currentPath.startsWith(route));

  if (isProtected) {
    // Dispatch event so UI can show "session expired" toast
    window.dispatchEvent(new CustomEvent("session-expired"));
    // Redirect to home page after short delay
    setTimeout(() => {
      window.location.href = "/";
    }, 1500);
  }
  // On public pages — just clear tokens silently, no redirect
};

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// Refresh token on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` };
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = Cookies.get("refresh_token");
      if (!refreshToken) {
        isRefreshing = false;
        handleSessionExpired();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });
        const newAccess = data.access;
        // Fix: use actual protocol, not NODE_ENV
        const secure = typeof window !== "undefined" && window.location.protocol === "https:";
        Cookies.set("access_token", newAccess, { expires: 1, secure, sameSite: "lax" });
        processQueue(null, newAccess);
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newAccess}` };
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        handleSessionExpired();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;