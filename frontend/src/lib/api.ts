/**
 * Axios API client with JWT refresh token handling.
 */
import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import { STOREFRONT_ROOTS, storefrontRootFor } from "@/lib/authRedirect";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Frontend paths that require authentication — show the "session expired"
// toast and bounce the user out if the session dies while they are on one.
// These are storefront-scoped: both /shop/... and /restaurant/... have their
// own cart/checkout/orders trees.
const PROTECTED_SUFFIXES = [
  "/cart",
  "/checkout",
  "/orders",
  "/profile",
  "/notifications",
];
const PROTECTED_ROUTES = [
  "/admin",
  ...STOREFRONT_ROOTS.flatMap((s) => PROTECTED_SUFFIXES.map((p) => `${s}${p}`)),
];

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
    // Send them back to the storefront they were in, not the other one's home.
    const destination = storefrontRootFor(currentPath);
    setTimeout(() => {
      window.location.href = destination;
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