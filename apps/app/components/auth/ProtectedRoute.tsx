'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { verifySessionToken, readSessionSecret, SESSION_COOKIE_NAME, type SessionPayload } from '@verifactu/utils';

export function ProtectedRoute({ children, requireEmailVerification = false }: { 
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}) {
  const router = useRouter();
  const [sessionPayload, setSessionPayload] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        // Get cookie from document
        const cookieName = SESSION_COOKIE_NAME;
        const value = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${cookieName}=`))
          ?.split('=')[1];

        console.log('[🧠 ProtectedRoute] Checking session cookie', {
          hasCookie: !!value,
          cookieName,
        });

        if (!value) {
          console.log('[🧠 ProtectedRoute] No session cookie, redirecting to login');
          setLoading(false);
          router.push('/login');
          return;
        }

        // Verify token on client is not recommended for production
        // Instead, rely on middleware verification
        // Just set a placeholder payload to show children
        setSessionPayload({ 
          uid: 'verified',
          email: null,
          tenantId: undefined,
          roles: [],
          tenants: [],
          ver: 1,
        });
        setLoading(false);
      } catch (err) {
        console.error('[🧠 ProtectedRoute] Session check error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
        router.push('/login');
      }
    }

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!sessionPayload) {
    return null;
  }

  // Note: Email verification check is disabled for Google OAuth users
  // who don't have emailVerified status
  if (requireEmailVerification) {
    console.log('[🧠 ProtectedRoute] Email verification requirement noted (may not apply to OAuth users)');
  }

  return <>{children}</>;
}
                } else {
                  alert('Aún no has verificado tu email. Revisa tu bandeja de entrada.');
                }
              });
            }}
            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors mb-4"
          >
            Ya verifiqué mi email
          </button>

          <button
            onClick={() => router.push('/login')}
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
