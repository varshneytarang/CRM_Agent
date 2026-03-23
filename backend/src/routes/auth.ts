import type { Request, Response } from "express";
import { Router } from "express";
import { registerUser, authenticateUser, getUserById, updateUserProfile } from "../db/repositories/authRepository";
import { createJWT, verifyJWT } from "../security/auth";

export const authRouter = Router();

/**
 * Middleware to verify JWT token
 */
export function requireAuth(req: Request, res: Response, next: Function) {
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
 * Logout user (client-side token deletion)
 */
authRouter.post("/logout", (_req: Request, res: Response) => {
  // JWT is stateless, so logout just means client deletes the token
  return res.json({ message: "Logout successful. Please delete your token on the client side." });
});
