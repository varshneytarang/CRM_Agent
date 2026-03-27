import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthMotionPanel } from "./AuthMotionPanel";

export function Login() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(emailOrUsername, password);
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-layout">
        <section className="auth-form-column">
          <div className="auth-form-card">
            <p className="auth-kicker">Welcome Back</p>
            <h1 className="auth-title">Sign in to CRM Agent</h1>
            <p className="auth-subtitle">Continue with your account to access your command center.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <input
                  id="emailOrUsername"
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder=" "
                  className="auth-input"
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
                <label htmlFor="emailOrUsername" className="auth-floating-label">
                  Email or username
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
                  autoComplete="current-password"
                />
                <label htmlFor="password" className="auth-floating-label">
                  Password
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
                  Forgot password?
                </a>
              </div>

              <button type="submit" disabled={isLoading} className="ds-btn ds-btn-primary w-full auth-submit-btn">
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="auth-switch-copy">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="ds-link">
                Create one
              </Link>
            </p>
          </div>
        </section>

        <AuthMotionPanel
          title="Watch your revenue signals align"
          subtitle="This playground mirrors the calm, live responsiveness of your CRM command center."
          accentLabel="Nudge Agent Flow"
        />
      </div>
    </div>
  );
}
