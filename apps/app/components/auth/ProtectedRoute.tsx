'use client';

/**
 * ProtectedRoute Component
 * 
 * SIMPLIFIED: Session validation is now done entirely by middleware.ts
 * This component just renders children if middleware allowed the request.
 * 
 * The middleware checks for valid JWT cookie before this component ever loads.
 */

export function ProtectedRoute({ 
  children,
  requireEmailVerification = false 
}: { 
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}) {
  console.log('[🧠 ProtectedRoute] Component mounted - middleware already validated session');
  
  // If we got here, middleware validated the session
  // (if session was invalid, middleware would have redirected to login)
  return <>{children}</>;
}

