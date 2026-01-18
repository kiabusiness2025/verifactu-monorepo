"use client";

import React, { useState, Suspense } from "react";
import { usePathname } from "next/navigation";
import { IsaakUIProvider, useIsaakUI } from "@/context/IsaakUIContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { IsaakDrawer } from "@/components/isaak/IsaakDrawer";
import { IsaakSmartFloating } from "@/components/isaak/IsaakSmartFloating";
import { IsaakProactiveBubbles } from "@/components/isaak/IsaakProactiveBubbles";
import { IsaakPreferencesModal } from "@/components/isaak/IsaakPreferencesModal";
import { IsaakDeadlineNotifications } from "@/components/isaak/IsaakDeadlineNotifications";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useOnboarding } from "@/hooks/useOnboarding";
import { CreateCompanyModalProvider } from "@/context/CreateCompanyModalContext";

function OnboardingFlow({ isAdminRoute }: { isAdminRoute: boolean }) {
  const { company } = useIsaakUI();
  const isDemoCompany = company?.toLowerCase().includes("demo");
  const {
    hasSeenWelcome,
    markWelcomeSeen,
    markOnboardingComplete,
  } = useOnboarding();
  const [showTour, setShowTour] = useState(false);

  if (isAdminRoute || !isDemoCompany) return null;

  const handleWelcomeComplete = async () => {
    await markWelcomeSeen();
    setShowTour(true);
  };

  const handleTourComplete = async () => {
    await markOnboardingComplete();
    setShowTour(false);
  };

  const handleTourSkip = async () => {
    await markOnboardingComplete();
    setShowTour(false);
  };

  return (
    <>
      <WelcomeModal isOpen={!hasSeenWelcome} onComplete={handleWelcomeComplete} />
      <OnboardingTour isOpen={showTour} onComplete={handleTourComplete} onSkip={handleTourSkip} />
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/dashboard/admin");
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  return (
    <ProtectedRoute requireEmailVerification={true}>
      <IsaakUIProvider>
        <CreateCompanyModalProvider>
          <div className="app-shell flex min-h-screen">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex min-h-screen w-full flex-col lg:pl-72">
              <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} onOpenPreferences={() => setPreferencesOpen(true)} />
              <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 pb-10 sm:px-6 sm:py-8">
                {children}
              </main>
              <footer className="mt-auto border-t border-slate-200 bg-white/85 backdrop-blur">
                <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <span className="font-semibold text-[#0b214a]">Verifactu Business</span>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <a 
                      className="hover:text-blue-700" 
                      href="https://verifactu.business"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ir a Home
                    </a>
                    <a className="hover:text-blue-700" href="/dashboard/settings">
                      Configuracion
                    </a>
                  </div>
                </div>
              </footer>
            </div>
          </div>
          {!isAdminRoute && <IsaakDrawer />}
          
          {/* Isaak V3: Analytics + History + Voice + Preferences + Deadlines */}
          {!isAdminRoute && (
            <Suspense fallback={null}>
              <IsaakSmartFloating />
              <IsaakProactiveBubbles />
              <IsaakDeadlineNotifications />
            </Suspense>
          )}

          {/* Preferences Modal */}
          {!isAdminRoute && (
            <IsaakPreferencesModal
              isOpen={preferencesOpen}
              onClose={() => setPreferencesOpen(false)}
            />
          )}

          <OnboardingFlow isAdminRoute={isAdminRoute} />
        </CreateCompanyModalProvider>
      </IsaakUIProvider>
    </ProtectedRoute>
  );
}
