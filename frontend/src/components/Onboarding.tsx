import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

declare global {
  interface Window {
    MergeLink: {
      open: (config: any) => void;
    };
  }
}

export function Onboarding() {
  const [step, setStep] = useState(1);
  const [crmConnected, setCrmConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [endUserOriginId, setEndUserOriginId] = useState("");

  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Initialize Merge Link
  const openMergeLink = useCallback(async () => {
    if (!user) {
      alert("User not found");
      return;
    }

    try {
      // Generate a unique end_user_origin_id based on user
      const originId = `user_${user.userid}`;
      setEndUserOriginId(originId);

      // Fetch link token from backend
      const response = await fetch("http://localhost:3001/api/merge/link-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          end_user_origin_id: originId,
          end_user_organization_name: user.org_name || "Unknown Org",
          end_user_email_address: user.email || "noemail@example.com",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create link token");
      }

      const data = await response.json();
      const linkToken = data.link_token;

      // Open Merge Link widget
      if (window.MergeLink) {
        window.MergeLink.open({
          linkToken,
          onSuccess: (publicToken: string) => {
            handleMergeLinkSuccess(publicToken, originId);
          },
          onError: (error: any) => {
            console.error("Merge Link error:", error);
            alert("Failed to connect CRM");
          },
        });
      } else {
        alert("Merge Link widget not loaded. Make sure to include the Merge Link script.");
      }
    } catch (err) {
      console.error("Error opening Merge Link:", err);
      alert(err instanceof Error ? err.message : "Failed to open CRM connection");
    }
  }, [user, token]);

  async function handleMergeLinkSuccess(publicToken: string, originId: string) {
    try {
      setIsLoading(true);

      // Exchange public token for account token
      const response = await fetch("http://localhost:3001/api/merge/account-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          public_token: publicToken,
          end_user_origin_id: originId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to exchange token");
      }

      setCrmConnected(true);
      setStep(2);
    } catch (err) {
      console.error("Token exchange error:", err);
      alert(err instanceof Error ? err.message : "Failed to connect CRM");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSkip() {
    navigate("/");
  }

  function handleContinue() {
    navigate("/hubspot-dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Welcome to CRM Agent, {user?.username}! 👋</h1>
          <p className="text-lg text-gray-600 mt-2">Let's set up your CRM integration</p>
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-8">
            <div className={`flex flex-col items-center ${step >= 1 ? "text-indigo-600" : "text-gray-400"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${step >= 1 ? "bg-indigo-600 text-white" : "bg-gray-200"}`}>
                1
              </div>
              <p className="mt-2 text-sm font-medium">Connect CRM</p>
            </div>

            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? "bg-indigo-600" : "bg-gray-300"}`}></div>

            <div className={`flex flex-col items-center ${step >= 2 ? "text-indigo-600" : "text-gray-400"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${step >= 2 ? "bg-indigo-600 text-white" : "bg-gray-200"}`}>
                2
              </div>
              <p className="mt-2 text-sm font-medium">Complete</p>
            </div>
          </div>

          {/* Step 1: Connect CRM */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Step 1: Connect Your CRM</h2>
              <p className="text-gray-600">
                Click the button below to connect your HubSpot or other CRM through Merge API. This allows CRM Agent to access your deals, opportunities, and contacts.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Merge supports multiple CRM providers. You can connect HubSpot, Salesforce, Pipedrive, and more through a single integration!
                </p>
              </div>

              <button
                onClick={openMergeLink}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition flex items-center justify-center"
              >
                {isLoading ? "Connecting..." : "🔗 Connect Your CRM"}
              </button>

              <button
                onClick={handleSkip}
                className="w-full text-gray-600 hover:text-gray-900 font-medium py-2"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* Step 2: Success */}
          {step === 2 && (
            <div className="space-y-6 text-center">
              <div className="text-6xl">✅</div>
              <h2 className="text-2xl font-bold text-gray-900">CRM Connected!</h2>
              <p className="text-gray-600">
                Your CRM is now connected. You can start managing your pipeline and analyzing deals right away.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>Great!</strong> You're all set. Your CRM data is now accessible in the dashboard.
                </p>
              </div>

              <button
                onClick={handleContinue}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">What can you do with CRM Agent?</h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              <span>View all deals and opportunities from your CRM</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              <span>Analyze pipeline health and identify at-risk deals</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              <span>Track contacts, companies, and engagement history</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              <span>Get AI-powered risk assessments for your pipeline</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
