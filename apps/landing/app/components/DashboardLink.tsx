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
 * - If authenticated: Links to app.verifactu.business/dashboard
 * - If not authenticated: Links to landing /auth/login
 * 
 * This ensures users are always redirected to the correct login page
 * if they don't have a valid session.
 */
export function DashboardLink({
  className = "px-6 py-2 rounded-full bg-gradient-to-r from-[#0060F0] to-[#20B0F0] text-white font-semibold shadow-md hover:from-[#0056D6] hover:to-[#1AA3DB] transition-all text-sm",
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

  // If user is authenticated, redirect to app dashboard
  if (user) {
    const appUrl = getAppUrl();
    const href = `${appUrl.replace(/\/$/, "")}/dashboard`;
    
    return (
      <a
        href={href}
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
