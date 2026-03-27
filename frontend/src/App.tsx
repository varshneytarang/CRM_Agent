import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LandingPage } from "./components/LandingPage";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { Onboarding } from "./components/Onboarding";
import { ProtectedRoute } from "./components/ProtectedRoute";
import RetentionDashboard from "./components/RetentionDashboard";
import AgentCommandCenter from "./components/AgentCommandCenter";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hubspot-dashboard"
            element={
              <ProtectedRoute>
                <AgentCommandCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute>
                <AgentCommandCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/retention"
            element={
              <ProtectedRoute>
                <RetentionDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<LandingPage />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
