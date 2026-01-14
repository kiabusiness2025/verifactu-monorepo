"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

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
  const [appUrl, setAppUrl] = useState<string>("");

  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://app.verifactu.business");
    setAppUrl(url);
  }, []);

  if (loading || !appUrl) {
    return null;
  }

  const href = user
    ? `${appUrl.replace(/\/$/, "")}/dashboard`
    : "/auth/login";

  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
