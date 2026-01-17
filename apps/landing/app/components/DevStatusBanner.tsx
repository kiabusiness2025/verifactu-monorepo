"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function DevStatusBanner() {
  const { user, loading, isEmailVerified } = useAuth();

  // Avoid hydration mismatch: render placeholder on SSR, update after mount
  const [host, setHost] = useState<string>("server");
  useEffect(() => {
    try {
      setHost(window.location.hostname || "client");
    } catch {
      setHost("client");
    }
  }, []);
  const hasEnv = [
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ].every(Boolean);

  return (
    <div className="fixed bottom-3 left-3 z-50">
      <div className="rounded-lg shadow-md bg-white/90 backdrop-blur px-4 py-2 text-xs text-gray-700 border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="font-semibold">DEV</span>
          <span suppressHydrationWarning>env: {host}</span>
          <span className={hasEnv ? "text-emerald-600" : "text-red-600"}>
            envVars: {hasEnv ? "ok" : "missing"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span>auth:</span>
          {loading ? (
            <span>loading...</span>
          ) : user ? (
            <span className="text-emerald-600">signed-in</span>
          ) : (
            <span className="text-gray-600">anonymous</span>
          )}
          {user && (
            <span className={isEmailVerified ? "text-emerald-600" : "text-amber-600"}>
              verified: {isEmailVerified ? "yes" : "no"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

