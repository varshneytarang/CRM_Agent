import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { registerUser, authenticateUser, getUserById, updateUserProfile } from "../db/repositories/authRepository";
import { createJWT, createRefreshJWT, verifyJWT, verifyRefreshJWT } from "../security/auth";

export const authRouter = Router();
const REFRESH_COOKIE_NAME = "crm_refresh_token";

function parseCookie(header: string | undefined, key: string): string | null {
  if (!header) {
    return null;
  }

  const entries = header.split(";");
  for (const entry of entries) {
    const [rawName, ...rawValue] = entry.trim().split("=");
    if (rawName === key) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Number(process.env.JWT_REFRESH_EXPIRY_SECONDS ?? 7 * 24 * 60 * 60) * 1000,
    path: "/",
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

/**
 * Middleware to verify JWT token
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix
  const payload = verifyJWT(token);

  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Attach user to request
  (req as any).user = payload;
  next();
}

/**
 * POST /auth/register
 * Register a new user
 */
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password, org_name } = req.body ?? {};

    // Validate inputs
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    if (email && typeof email !== "string") {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const user = await registerUser(
      username.trim(),
      email?.trim() || null,
      password,
      org_name?.trim() || null
    );

    // Create JWT token
    const token = createJWT({
      userid: user.userid,
      username: user.username,
    });
    const refreshToken = createRefreshJWT({
      userid: user.userid,
      username: user.username,
    });
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      user,
      token,
    });
  } catch (err: any) {
    const status = err?.status ?? 500;
    const message = err?.message || "Registration failed";
    return res.status(status).json({ error: message });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return JWT
 */
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body ?? {};

    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Username is required" });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Password is required" });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Create JWT token
    const token = createJWT({
      userid: user.userid,
      username: user.username,
    });
    const refreshToken = createRefreshJWT({
      userid: user.userid,
      username: user.username,
    });
    setRefreshCookie(res, refreshToken);

    return res.json({
      user,
      token,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

/**
 * POST /auth/refresh
 * Exchange valid refresh cookie for a new access token
 */
authRouter.post("/refresh", async (req: Request, res: Response) => {
  try {
    const refreshToken = parseCookie(req.headers.cookie, REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      return res.status(401).json({ error: "Missing refresh token" });
    }

    const payload = verifyRefreshJWT(refreshToken);
    if (!payload) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const user = await getUserById(payload.userid);
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: "User not found" });
    }

    const nextAccessToken = createJWT({
      userid: user.userid,
      username: user.username,
    });
    const nextRefreshToken = createRefreshJWT({
      userid: user.userid,
      username: user.username,
    });

    setRefreshCookie(res, nextRefreshToken);

    return res.json({
      user,
      token: nextAccessToken,
    });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ error: "Failed to refresh session" });
  }
});

/**
 * GET /auth/me
 * Get current user profile (requires auth)
 */
authRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const user = await getUserById(payload.userid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

/**
 * PUT /auth/profile
 * Update user profile (requires auth)
 */
authRouter.put("/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const { org_name, email } = req.body ?? {};

    const user = await updateUserProfile(payload.userid, {
      org_name: org_name !== undefined ? org_name : undefined,
      email: email !== undefined ? email : undefined,
    });

    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

/**
 * POST /auth/logout
 * Logout user and clear refresh token cookie
 */
authRouter.post("/logout", (_req: Request, res: Response) => {
  clearRefreshCookie(res);
  return res.json({ message: "Logout successful" });
});
