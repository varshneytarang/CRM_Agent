import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;
const baseURL = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "") : "/";

export const api = axios.create({
  baseURL,
  timeout: 0,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: on 401 attempt refresh and retry once
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeToken(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    if (status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const res = await api.post("/api/auth/refresh");
          const newToken = res.data?.token;
          if (newToken) {
            localStorage.setItem("auth_token", newToken);
            api.defaults.headers.Authorization = `Bearer ${newToken}`;
            onRefreshed(newToken);
          }
        } catch (refreshErr) {
          // Refresh failed — clear session and forward the error
          localStorage.removeItem("auth_token");
          refreshSubscribers = [];
          isRefreshing = false;
          return Promise.reject(refreshErr);
        }
        isRefreshing = false;
      }

      return new Promise((resolve) => {
        subscribeToken((token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);
