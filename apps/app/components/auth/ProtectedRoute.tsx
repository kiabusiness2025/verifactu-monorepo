'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';

export function ProtectedRoute({ children, requireEmailVerification = false }: { 
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleResendEmail = async () => {
    if (!user) return;
    
    setResendingEmail(true);
    try {
      await sendEmailVerification(user);
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (error) {
      console.error('Error sending verification email:', error);
    } finally {
      setResendingEmail(false);
    }
  };

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

  if (!user) {
    return null;
  }

  // Si se requiere verificación de email y el usuario no está verificado
  if (requireEmailVerification && !user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Verifica tu email
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Hemos enviado un email de verificación a:
          </p>

          <p className="text-blue-600 dark:text-blue-400 font-medium mb-6">
            {user.email}
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Haz clic en el enlace del email para verificar tu cuenta y acceder al dashboard.
          </p>

          {emailSent && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              ✓ Email reenviado correctamente
            </div>
          )}

          <button
            onClick={handleResendEmail}
            disabled={resendingEmail || emailSent}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-4"
          >
            {resendingEmail ? 'Enviando...' : emailSent ? 'Email enviado ✓' : 'Reenviar email de verificación'}
          </button>

          <button
            onClick={() => {
              user.reload().then(() => {
                if (user.emailVerified) {
                  window.location.reload();
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
