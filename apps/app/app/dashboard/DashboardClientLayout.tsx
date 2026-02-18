'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { IsaakDeadlineNotifications } from '@/components/isaak/IsaakDeadlineNotifications';
import { IsaakDrawer } from '@/components/isaak/IsaakDrawer';
import { IsaakPreferencesModal } from '@/components/isaak/IsaakPreferencesModal';
import { IsaakProactiveBubbles } from '@/components/isaak/IsaakProactiveBubbles';
import { IsaakSmartFloating } from '@/components/isaak/IsaakSmartFloating';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { CreateCompanyModalProvider } from '@/context/CreateCompanyModalContext';
import { IsaakUIProvider, useIsaakUI } from '@/context/IsaakUIContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { usePathname } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';

function OnboardingFlow({ isAdminRoute }: { isAdminRoute: boolean }) {
  const { company } = useIsaakUI();
  const isDemoCompany = company?.toLowerCase().includes('demo');
  const { hasSeenWelcome, markWelcomeSeen, markOnboardingComplete } = useOnboarding();
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

type Props = {
  children: React.ReactNode;
  supportMode: boolean;
  supportTenantName?: string | null;
};

export default function DashboardClientLayout({ children, supportMode, supportTenantName }: Props) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/dashboard/admin') ?? false;
  const enableIsaak = false;
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const readDemoMode = () => {
      if (typeof window === 'undefined') return;
      const fromStorage = window.localStorage.getItem('vf_demo_mode') === '1';
      const fromGlobal = window.__VF_DEMO_MODE__ === true;
      setIsDemoMode(fromStorage || fromGlobal || pathname?.startsWith('/demo') === true);
    };

    readDemoMode();
    window.addEventListener('vf-demo-mode', readDemoMode);
    return () => window.removeEventListener('vf-demo-mode', readDemoMode);
  }, [pathname]);

  return (
    <ProtectedRoute requireEmailVerification={true}>
      <IsaakUIProvider>
        <CreateCompanyModalProvider>
          <div className="min-h-screen">
            {supportMode ? (
              <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50/80 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm text-amber-900 sm:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
                      Modo soporte
                    </span>
                    <span className="text-xs text-amber-800">
                      {supportTenantName
                        ? `Estás viendo la cuenta de ${supportTenantName}`
                        : 'Estás viendo la cuenta del cliente'}
                    </span>
                  </div>
                  <form action="/api/support/end" method="post">
                    <button className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100">
                      Salir
                    </button>
                  </form>
                </div>
              </div>
            ) : null}

            <div className="app-shell flex min-h-screen">
              <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                isDemo={isDemoMode}
              />
              <div className="flex min-h-screen w-full flex-col lg:pl-72">
                <Topbar
                  onToggleSidebar={() => setSidebarOpen((v) => !v)}
                  onOpenPreferences={() => setPreferencesOpen(true)}
                />
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

            {!isAdminRoute && enableIsaak ? <IsaakDrawer /> : null}

            {!isAdminRoute && enableIsaak ? (
              <Suspense fallback={null}>
                <IsaakSmartFloating />
                <IsaakProactiveBubbles />
                <IsaakDeadlineNotifications />
              </Suspense>
            ) : null}

            {!isAdminRoute && enableIsaak ? (
              <IsaakPreferencesModal
                isOpen={preferencesOpen}
                onClose={() => setPreferencesOpen(false)}
              />
            ) : null}

            <OnboardingFlow isAdminRoute={isAdminRoute} />
          </div>
        </CreateCompanyModalProvider>
      </IsaakUIProvider>
    </ProtectedRoute>
  );
}
