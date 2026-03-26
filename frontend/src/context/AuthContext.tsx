import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api";

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

export interface User {
  userid: string;
  username: string;
  org_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, orgName?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function persistSession(nextToken: string, nextUser: User) {
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
  }

  function clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  }

  // Restore session on mount
  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedUserRaw = localStorage.getItem(AUTH_USER_KEY);

      if (storedUserRaw) {
        try {
          const parsedUser = JSON.parse(storedUserRaw) as User;
          setUser(parsedUser);
        } catch {
          localStorage.removeItem(AUTH_USER_KEY);
        }
      }

      try {
        if (storedToken) {
          setToken(storedToken);
          await fetchUserProfile(storedToken);
        } else {
          await refreshSession();
        }
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          try {
            await refreshSession();
          } catch {
            clearSession();
          }
        } else {
          clearSession();
        }
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  async function fetchUserProfile(authToken: string): Promise<User> {
    try {
      const response = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const { user: nextUser } = response.data;
      setUser(nextUser);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
      return nextUser;
    } catch (err: any) {
      const message =
        err?.response?.data?.error ??
        err?.message ??
        "Failed to fetch user profile";
      const enriched = new Error(message) as Error & { response?: any };
      enriched.response = err?.response;
      throw enriched;
    }
  }

  async function refreshSession(): Promise<void> {
    const response = await api.post("/api/auth/refresh");
    const { token: nextToken, user: nextUser } = response.data;
    setToken(nextToken);
    setUser(nextUser);
    persistSession(nextToken, nextUser);
  }

  async function login(username: string, password: string): Promise<void> {
    try {
      const response = await api.post("/api/auth/login", { username, password });
      const { token: nextToken, user: nextUser } = response.data;
      setToken(nextToken);
      setUser(nextUser);
      persistSession(nextToken, nextUser);
    } catch (err: any) {
      const message = err?.response?.data?.error ?? err?.message ?? "Login failed";
      throw new Error(message);
    }
  }

  async function register(
    username: string,
    email: string,
    password: string,
    orgName?: string
  ): Promise<void> {
    try {
      const response = await api.post("/api/auth/register", {
        username,
        email,
        password,
        org_name: orgName,
      });
      const { token: nextToken, user: nextUser } = response.data;
      setToken(nextToken);
      setUser(nextUser);
      persistSession(nextToken, nextUser);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ?? err?.message ?? "Registration failed";
      throw new Error(message);
    }
  }

  async function logout(): Promise<void> {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Clear local session even if backend logout fails.
    }
    clearSession();
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
