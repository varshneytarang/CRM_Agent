import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthMotionPanel } from "./AuthMotionPanel";

export function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validation
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await register(username, email, password, "");
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-layout">
        <section className="auth-form-column">
          <div className="auth-form-card">
            <p className="auth-kicker">Create Account</p>
            <h1 className="auth-title">Start with CRM Agent</h1>
            <p className="auth-subtitle">Set up your account in a minute and launch your AI-guided workspace.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form auth-form-register">
              <div className="auth-field">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder=" "
                  className="auth-input"
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
                <label htmlFor="username" className="auth-floating-label">
                  Username
                </label>
              </div>

              <div className="auth-field">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  className="auth-input"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
                <label htmlFor="email" className="auth-floating-label">
                  Email
                </label>
              </div>

              <div className="auth-field">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className="auth-input"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <label htmlFor="password" className="auth-floating-label">
                  Password
                </label>
              </div>

              <div className="auth-field">
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder=" "
                  className="auth-input"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <label htmlFor="confirmPassword" className="auth-floating-label">
                  Confirm password
                </label>
              </div>

              <div className="auth-form-row">
                <label className="auth-checkbox-row">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="auth-checkbox"
                    disabled={isLoading}
                  />
                  Remember me
                </label>
                <a href="#" className="auth-link-muted" onClick={(e) => e.preventDefault()}>
                  Need help?
                </a>
              </div>

              <button type="submit" disabled={isLoading} className="ds-btn ds-btn-primary w-full auth-submit-btn">
                {isLoading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="auth-switch-copy">
              Already have an account?{" "}
              <Link to="/login" className="ds-link">
                Sign in
              </Link>
            </p>
          </div>
        </section>

        <AuthMotionPanel
          title="Preview the live decision flow"
          subtitle="See how signals, scoring, and agent guidance stay connected in one calm interface."
          accentLabel="Pulse Demo"
        />
      </div>
    </div>
  );
}
