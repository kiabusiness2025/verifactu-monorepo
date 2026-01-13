'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';
import { trackLogin, trackSignup } from '@/components/FirebaseAnalytics';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        trackLogin('email');
        
        // Sincronizar con Prisma
        await syncUserWithPrisma(userCredential.user);
        
        // Redirigir al dashboard
        router.push('/dashboard');
      } else {
        // Registro
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        trackSignup('email');
        
        // Enviar verificación de email
        if (userCredential.user) {
          await sendEmailVerification(userCredential.user);
          setSuccess('¡Cuenta creada! Revisa tu email para verificar tu cuenta.');
        }
        
        // Sincronizar con Prisma (crear tenant, membership, etc.)
        await syncUserWithPrisma(userCredential.user);
        
        // Redirigir al dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      
      // Mensajes de error en español
      const errorMessages: Record<string, string> = {
        'auth/email-already-in-use': 'Este email ya está registrado',
        'auth/invalid-email': 'Email inválido',
        'auth/operation-not-allowed': 'Operación no permitida',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/user-disabled': 'Usuario deshabilitado',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/invalid-credential': 'Credenciales inválidas',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
      };
      
      setError(errorMessages[err.code] || 'Error de autenticación. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const syncUserWithPrisma = async (user: any) => {
    try {
      await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
        }),
      });
    } catch (error) {
      console.error('Error syncing user with Prisma:', error);
      // No bloqueamos el login si falla la sincronización
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      trackLogin('google');
      
      // Sincronizar con Prisma
      await syncUserWithPrisma(userCredential.user);
      
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError('Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({
        tenant: 'common', // Permite cuentas personales y de trabajo/escuela
      });
      const userCredential = await signInWithPopup(auth, provider);
      trackLogin('microsoft');
      
      // Sincronizar con Prisma
      await syncUserWithPrisma(userCredential.user);
      
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Microsoft auth error:', err);
      setError('Error al iniciar sesión con Microsoft');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Introduce tu email primero');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Email de recuperación enviado. Revisa tu bandeja de entrada.');
      setShowForgotPassword(false);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError('Error al enviar email de recuperación');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Recuperar Contraseña
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="tu@email.com"
            required
          />
        </div>

        <button
          onClick={handlePasswordReset}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Enviando...' : 'Enviar Email de Recuperación'}
        </button>

        <button
          onClick={() => setShowForgotPassword(false)}
          className="w-full mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Volver al login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="tu@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        {isLogin && (
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">O continúa con</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-4 w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >

        <button
          onClick={handleMicrosoftLogin}
          disabled={loading}
          className="mt-3 w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 23 23" fill="currentColor">
            <path d="M11 0H0v11h11V0zM23 0H12v11h11V0zM11 12H0v11h11V12zM23 12H12v11h11V12z" />
          </svg>
          Microsoft
        </button>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setSuccess('');
          }}
          className="ml-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
        >
          {isLogin ? 'Crear cuenta' : 'Iniciar sesión'}
        </button>
      </p>
    </div>
  );
}
