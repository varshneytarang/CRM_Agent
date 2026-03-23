import { query, queryOne } from "../connection";
import { hashPassword, verifyPassword } from "../../security/auth";

export interface User {
  userid: string;
  username: string;
  org_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

interface UserWithPassword extends User {
  password_hash: string;
}

/**
 * Register a new user
 */
export async function registerUser(
  username: string,
  email: string,
  password: string,
  orgName?: string
): Promise<User> {
  try {
    // Check if username already exists
    const existing = await queryOne(
      `SELECT userid FROM users WHERE username = $1`,
      [username]
    );

    if (existing) {
      throw Object.assign(
        new Error("Username already exists"),
        { status: 409 }
      );
    }

    // Check if email already exists
    if (email) {
      const existingEmail = await queryOne(
        `SELECT userid FROM users WHERE email = $1`,
        [email]
      );
      if (existingEmail) {
        throw Object.assign(
          new Error("Email already registered"),
          { status: 409 }
        );
      }
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create user
    const user = await queryOne<User>(
      `INSERT INTO users (userid, username, org_name, email, password_hash, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
       RETURNING userid, username, org_name, email, created_at, updated_at`,
      [username, orgName || null, email || null, passwordHash]
    );

    if (!user) {
      throw new Error("Failed to create user");
    }

    return user;
  } catch (err) {
    console.error("User registration failed:", err);
    throw err;
  }
}

/**
 * Authenticate user with username and password
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<User | null> {
  try {
    const userWithPassword = await queryOne<UserWithPassword>(
      `SELECT userid, username, org_name, email, password_hash, created_at, updated_at 
       FROM users WHERE username = $1`,
      [username]
    );

    if (!userWithPassword) {
      return null;
    }

    // Verify password
    const isValid = verifyPassword(password, userWithPassword.password_hash);
    if (!isValid) {
      return null;
    }

    // Return user without password hash
    const { password_hash, ...user } = userWithPassword;
    return user as User;
  } catch (err) {
    console.error("User authentication failed:", err);
    throw err;
  }
}

/**
 * Get user by userid
 */
export async function getUserById(userid: string): Promise<User | null> {
  try {
    const user = await queryOne<User>(
      `SELECT userid, username, org_name, email, created_at, updated_at 
       FROM users WHERE userid = $1`,
      [userid]
    );
    return user || null;
  } catch (err) {
    console.error("Get user by ID failed:", err);
    throw err;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userid: string,
  updates: { org_name?: string; email?: string }
): Promise<User> {
  try {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.org_name !== undefined) {
      setClauses.push(`org_name = $${paramIndex}`);
      params.push(updates.org_name);
      paramIndex++;
    }

    if (updates.email !== undefined) {
      setClauses.push(`email = $${paramIndex}`);
      params.push(updates.email);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return (await getUserById(userid))!;
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(userid);

    const user = await queryOne<User>(
      `UPDATE users SET ${setClauses.join(", ")} WHERE userid = $${paramIndex} RETURNING userid, username, org_name, email, created_at, updated_at`,
      params
    );

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  } catch (err) {
    console.error("Update user profile failed:", err);
    throw err;
  }
}
