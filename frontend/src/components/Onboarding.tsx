import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMergeLink } from "@mergeapi/react-merge-link";
import { api } from "../api";

export function Onboarding() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string>("");

  const { user } = useAuth();
  const navigate = useNavigate();

  const onSuccess = useCallback(async (public_token: string) => {
    try {
      setIsLoading(true);
      await api.post("/api/merge/account-token", {
        public_token,
        end_user_origin_id: user?.userid,
      });
      setStep(2);
    } catch (err: any) {
      console.error("Token exchange error:", err);
      const message = err?.response?.data?.error ?? err?.message ?? "Failed to connect CRM";
      alert(message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const { open, isReady } = useMergeLink(
    useMemo(
      () => ({
        linkToken,
        onSuccess,
      }),
      [linkToken, onSuccess]
    )
  );

  const openMergeLink = useCallback(async () => {
    if (!user) {
      alert("User not found");
      return;
    }

    if (!isReady) {
      alert("Merge Link widget is still loading. Please try again in a moment.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/api/merge/link-token", {
        end_user_origin_id: user.userid,
        end_user_organization_name: user.org_name || "Unknown Org",
        end_user_email_address: user.email || "noemail@example.com",
      });
      setLinkToken(response.data.link_token);

      // Wait for state update so hook sees the new token.
      setTimeout(() => open(), 0);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ?? err?.message ?? "Failed to create link token";
      alert(message);
    } finally {
      setIsLoading(false);
    }
  }, [isReady, open, user]);

  function handleSkip() {
    navigate("/");
  }

  function handleContinue() {
    navigate("/hubspot-dashboard");
  }

  return (
    <div className="ds-shell p-4">
      <div className="ds-container max-w-5xl">
        {/* Header */}
        <div className="ds-panel-strong mb-8 px-6 py-7">
          <p className="ds-kicker">Guided Setup</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-900">Welcome, {user?.username}.</h1>
          <p className="mt-2 text-base text-slate-600">Let's connect your CRM in a clean two-step flow.</p>
        </div>

        {/* Stepper */}
        <div className="ds-panel-strong mb-6 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className={`flex flex-col items-center ${step >= 1 ? "text-cyan-700" : "text-slate-400"}`}>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${step >= 1 ? "bg-cyan-700 text-white" : "bg-slate-200"}`}>
                1
              </div>
              <p className="mt-2 text-sm font-medium">Connect CRM</p>
            </div>

            <div className={`mx-4 h-1 flex-1 rounded-full ${step >= 2 ? "bg-cyan-700/80" : "bg-slate-300"}`}></div>

            <div className={`flex flex-col items-center ${step >= 2 ? "text-cyan-700" : "text-slate-400"}`}>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${step >= 2 ? "bg-cyan-700 text-white" : "bg-slate-200"}`}>
                2
              </div>
              <p className="mt-2 text-sm font-medium">Complete</p>
            </div>
          </div>

          {/* Step 1: Connect CRM */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-slate-900">Step 1: Connect your CRM</h2>
              <p className="text-slate-600">
                Click the button below to connect your HubSpot or other CRM through Merge API. This allows CRM Agent to access your deals, opportunities, and contacts.
              </p>

              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                <p className="text-sm text-cyan-800">
                  <strong>Note:</strong> Merge supports multiple CRM providers. You can connect HubSpot, Salesforce, Pipedrive, and more through a single integration!
                </p>
              </div>

              <button
                onClick={openMergeLink}
                disabled={isLoading}
                className="ds-btn ds-btn-primary w-full"
              >
                {isLoading ? "Connecting..." : "Connect Your CRM"}
              </button>

              {!isReady ? (
                <p className="text-xs text-slate-500">
                  Preparing Merge Link widget...
                </p>
              ) : null}

              <button
                onClick={handleSkip}
                className="ds-btn ds-btn-secondary w-full"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* Step 2: Success */}
          {step === 2 && (
            <div className="space-y-6 text-center">
              <div className="text-6xl">✅</div>
              <h2 className="text-2xl font-semibold text-slate-900">CRM Connected!</h2>
              <p className="text-slate-600">
                Your CRM is now connected. You can start managing your pipeline and analyzing deals right away.
              </p>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-800">
                  <strong>Great!</strong> You're all set. Your CRM data is now accessible in the dashboard.
                </p>
              </div>

              <button
                onClick={handleContinue}
                className="ds-btn ds-btn-primary w-full"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="ds-panel p-8">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">What you can do with CRM Agent</h3>
          <ul className="space-y-3 text-slate-700">
            <li className="flex items-start">
              <span className="mr-3 text-emerald-500">✓</span>
              <span>View all deals and opportunities from your CRM</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-emerald-500">✓</span>
              <span>Analyze pipeline health and identify at-risk deals</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-emerald-500">✓</span>
              <span>Track contacts, companies, and engagement history</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-emerald-500">✓</span>
              <span>Get AI-powered risk assessments for your pipeline</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
