import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LandingPage } from "./components/LandingPage";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { Onboarding } from "./components/Onboarding";
import { ProtectedRoute } from "./components/ProtectedRoute";
import RetentionDashboard from "./components/RetentionDashboard";
import { AgentWorkspaceProvider } from "./context/AgentWorkspaceContext";
import { AppShell } from "./components/dashboard/AppShell";

const DashboardPage = lazy(() => import("./components/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const AgentWorkspacePage = lazy(() => import("./components/dashboard/AgentWorkspacePage").then((module) => ({ default: module.AgentWorkspacePage })));
const SummaryRecommendationsPage = lazy(() =>
  import("./components/dashboard/SummaryRecommendationsPage").then((module) => ({ default: module.SummaryRecommendationsPage }))
);
const WorkspaceSettingsPage = lazy(() =>
  import("./components/dashboard/WorkspaceSettingsPage").then((module) => ({ default: module.WorkspaceSettingsPage }))
);

function ShellLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-700" />
    </div>
  );
}

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
            path="/app"
            element={
              <ProtectedRoute>
                <AgentWorkspaceProvider>
                  <Suspense fallback={<ShellLoader />}>
                    <AppShell />
                  </Suspense>
                </AgentWorkspaceProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="agents/:agentId" element={<AgentWorkspacePage />} />
            <Route path="summary" element={<SummaryRecommendationsPage />} />
            <Route path="settings" element={<WorkspaceSettingsPage />} />
          </Route>

          <Route path="/hubspot-dashboard" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/agents" element={<Navigate to="/app/dashboard" replace />} />

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
