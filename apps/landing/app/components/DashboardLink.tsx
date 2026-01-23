"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { getAppUrl } from "../lib/urls";

interface DashboardLinkProps {
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}

/**
 * DashboardLink Component
 * 
 * Intelligently routes users:
 * - If authenticated: Links to app.verifactu.business/dashboard with session sync
 * - If not authenticated: Links to landing /auth/login
 * 
 * Uses a special route that ensures session cookie is properly set
 * before redirecting to the app dashboard.
 */
export function DashboardLink({
  className = "px-6 py-2 rounded-full bg-[#2361d8] text-white font-semibold shadow-md hover:bg-[#1f55c0] transition-all text-sm",
  ariaLabel = "Ir al Dashboard",
  children = "Dashboard",
}: DashboardLinkProps) {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return null;
  }

  // If user is authenticated, use session-sync route to ensure cookie is set
  if (user) {
    return (
      <a
        href="/api/dashboard-redirect"
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }

  // If user is not authenticated, redirect to login
  return (
    <Link
      href="/auth/login"
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}


