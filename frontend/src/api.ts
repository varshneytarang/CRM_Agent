import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;
const baseURL = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "") : "/";

export const api = axios.create({
  baseURL,
  timeout: 15000,
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
