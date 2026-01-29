import { Suspense } from 'react';
import AuthErrorClient from './AuthErrorClient';

export const dynamic = 'force-dynamic';

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          Cargando...
        </div>
      }
    >
      <AuthErrorClient />
    </Suspense>
  );
}
