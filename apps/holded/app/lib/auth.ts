import type { User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  type AuthError,
  fetchSignInMethodsForEmail,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  reload,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  auth,
  firebaseInitError,
  isFirebaseConfigComplete,
  isFirebaseReady,
  missingConfigFields,
} from './firebase';
import { mintSessionCookie } from './serverSession';

type SignInOptions = {
  rememberDevice?: boolean;
};

export interface AuthErrorMessage {
  code: string;
  message: string;
  userMessage: string;
}

type AuthResult =
  | { user: User; error: null; warning?: string | null }
  | { user: null; error: AuthErrorMessage; warning?: null };

type RedirectSignInResult =
  | { redirecting: true; error: null }
  | { redirecting: false; error: AuthErrorMessage };

const authUnavailable = (): AuthResult => ({
  user: null,
  error: {
    code: 'auth/config-unavailable',
    message: 'Auth not initialized',
    userMessage: !isFirebaseConfigComplete
      ? `Faltan variables publicas de Firebase: ${missingConfigFields.join(', ')}.`
      : firebaseInitError
        ? `Firebase no ha podido iniciarse en este navegador. Detalle: ${firebaseInitError}`
        : 'El acceso no esta disponible ahora mismo. Revisa la configuracion publica de Firebase en este proyecto.',
  },
  warning: null,
});

function getErrorMessage(error: AuthError): AuthErrorMessage {
  const errorMap: Record<string, { message: string; userMessage: string }> = {
    'auth/invalid-email': {
      message: 'Invalid email format',
      userMessage: 'El correo no es valido. Revisalo e intentalo de nuevo.',
    },
    'auth/user-not-found': {
      message: 'User not found',
      userMessage: 'No encontramos una cuenta con ese correo.',
    },
    'auth/wrong-password': {
      message: 'Wrong password',
      userMessage: 'La contrasena no coincide. Intentalo de nuevo.',
    },
    'auth/invalid-credential': {
      message: 'Invalid credential',
      userMessage: 'No hemos podido validar ese acceso. Revisa los datos e intentalo de nuevo.',
    },
    'auth/invalid-login-credentials': {
      message: 'Invalid login credentials',
      userMessage:
        'No hemos podido validar ese acceso. Revisa el correo y la contrasena e intentalo de nuevo.',
    },
    'auth/user-disabled': {
      message: 'User disabled',
      userMessage:
        'Esta cuenta no esta disponible ahora mismo. Contacta con soporte si lo necesitas.',
    },
    'auth/user-token-expired': {
      message: 'User token expired',
      userMessage: 'Tu sesion anterior ya no es valida. Vuelve a entrar para continuar.',
    },
    'auth/popup-closed-by-user': {
      message: 'Popup closed',
      userMessage: 'Has cerrado la ventana antes de terminar el acceso.',
    },
    'auth/account-exists-with-different-credential': {
      message: 'Account exists with different credential',
      userMessage: 'Esta cuenta ya existe con otro metodo de acceso.',
    },
    'auth/unauthorized-domain': {
      message: 'Unauthorized domain',
      userMessage:
        'El dominio actual no esta autorizado en Firebase Authentication. Anadelo en Authorized domains.',
    },
    'auth/operation-not-allowed': {
      message: 'Operation not allowed',
      userMessage:
        'El proveedor Google no esta activado en Firebase Authentication para este proyecto.',
    },
    'auth/configuration-not-found': {
      message: 'Configuration not found',
      userMessage:
        'Google no esta bien configurado en Firebase Authentication para este proyecto.',
    },
    'auth/operation-not-supported-in-this-environment': {
      message: 'Operation not supported in this environment',
      userMessage:
        'Este navegador no permite completar el acceso con ventana emergente. Vamos a usar redireccion.',
    },
    'auth/web-storage-unsupported': {
      message: 'Web storage unsupported',
      userMessage:
        'Este navegador no permite guardar la sesion necesaria para completar el acceso.',
    },
    'auth/popup-blocked': {
      message: 'Popup blocked',
      userMessage:
        'El navegador bloqueo la ventana de Google. Permite popups e intentalo de nuevo.',
    },
    'auth/cancelled-popup-request': {
      message: 'Cancelled popup request',
      userMessage: 'Se cancelo el intento de acceso. Reintenta con Google.',
    },
    'auth/too-many-requests': {
      message: 'Too many requests',
      userMessage: 'Has hecho demasiados intentos. Espera un momento y vuelve a probar.',
    },
    'auth/network-request-failed': {
      message: 'Network request failed',
      userMessage:
        'No hemos podido hablar con Firebase por un problema de red. Intentalo de nuevo.',
    },
    'auth/app-not-authorized': {
      message: 'App not authorized',
      userMessage:
        'La configuracion OAuth de Google no autoriza este acceso todavia. Revisa Firebase y Google Cloud.',
    },
    'auth/domain-config-required': {
      message: 'Domain config required',
      userMessage:
        'Falta autorizar este dominio en Firebase Authentication para completar el acceso.',
    },
    'auth/invalid-app-credential': {
      message: 'Invalid app credential',
      userMessage:
        'La credencial web de Firebase no es valida para este proyecto. Revisa la configuracion publica.',
    },
    'auth/internal-error': {
      message: 'Internal error',
      userMessage:
        'Firebase ha devuelto un error interno al validar el acceso. Intentalo otra vez en unos minutos.',
    },
    'auth/invalid-api-key': {
      message: 'Invalid API key',
      userMessage:
        'La API key publica de Firebase no es valida para este despliegue de Holded.',
    },
    'auth/email-already-in-use': {
      message: 'Email already in use',
      userMessage: 'Ese correo ya tiene una cuenta. Inicia sesion para continuar.',
    },
    'auth/weak-password': {
      message: 'Weak password',
      userMessage: 'La contrasena debe tener al menos 6 caracteres.',
    },
  };

  const mapped = errorMap[error.code] || {
    message: error.message,
    userMessage: error.code
      ? `No hemos podido completar el acceso. Codigo: ${error.code}.`
      : 'No hemos podido completar el acceso. Intenta de nuevo dentro de unos minutos.',
  };

  return {
    code: error.code,
    message: mapped.message,
    userMessage: mapped.userMessage,
  };
}

export async function signInWithEmail(
  email: string,
  password: string,
  options: SignInOptions = {}
): Promise<AuthResult> {
  if (!isFirebaseConfigComplete || !isFirebaseReady || !auth) return authUnavailable();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    if (!userCredential.user.emailVerified) {
      return {
        user: null,
        error: {
          code: 'auth/email-not-verified',
          message: 'Email not verified',
          userMessage: 'Necesitas verificar tu correo antes de continuar.',
        },
        warning: null,
      };
    }

    await mintSessionCookie(userCredential.user, {
      rememberDevice: options.rememberDevice,
    });

    return { user: userCredential.user, error: null, warning: null };
  } catch (error) {
    return { user: null, error: getErrorMessage(error as AuthError), warning: null };
  }
}

export async function signInWithGoogle(options: SignInOptions = {}): Promise<AuthResult> {
  if (!isFirebaseConfigComplete || !isFirebaseReady || !auth) return authUnavailable();

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);

    await mintSessionCookie(userCredential.user, {
      rememberDevice: options.rememberDevice,
    });

    return { user: userCredential.user, error: null, warning: null };
  } catch (error) {
    return { user: null, error: getErrorMessage(error as AuthError), warning: null };
  }
}

export async function startGoogleRedirectSignIn(): Promise<RedirectSignInResult> {
  if (!isFirebaseConfigComplete || !isFirebaseReady || !auth) {
    const unavailable = authUnavailable();
    return {
      redirecting: false,
      error: unavailable.error!,
    };
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithRedirect(auth, provider);
    return { redirecting: true, error: null };
  } catch (error) {
    return {
      redirecting: false,
      error: getErrorMessage(error as AuthError),
    };
  }
}

export async function consumeGoogleRedirectResult(options: SignInOptions = {}): Promise<AuthResult> {
  if (!isFirebaseConfigComplete || !isFirebaseReady || !auth) return authUnavailable();

  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) {
      return {
        user: null,
        error: {
          code: 'auth/no-redirect-result',
          message: 'No redirect result',
          userMessage: 'No se ha encontrado un acceso pendiente para completar con Google.',
        },
        warning: null,
      };
    }

    await mintSessionCookie(result.user, {
      rememberDevice: options.rememberDevice,
    });

    return { user: result.user, error: null, warning: null };
  } catch (error) {
    return { user: null, error: getErrorMessage(error as AuthError), warning: null };
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
  profile: { fullName: string; phone?: string },
  source = 'holded_signup'
): Promise<AuthResult> {
  if (!isFirebaseConfigComplete || !isFirebaseReady || !auth) return authUnavailable();

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const trimmedFullName = profile.fullName.trim();
    let warning: string | null = null;

    if (trimmedFullName) {
      await updateProfile(userCredential.user, {
        displayName: trimmedFullName,
      });
    }

    const idToken = await userCredential.user.getIdToken(true);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        source,
        fullName: trimmedFullName,
        phone: profile.phone?.trim() || '',
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      console.warn('[holded auth] register bootstrap failed', {
        error: payload?.error || 'register bootstrap failed',
      });
      warning =
        'Hemos creado tu cuenta. Si no ves el correo de verificacion, revisa spam o vuelve a intentarlo en unos minutos.';
    } else {
      const payload = await response.json().catch(() => ({}));
      if (!payload?.verificationEmailSent) {
        warning =
          'Hemos creado tu cuenta. Si no ves el correo de verificacion de Holded, revisa spam o vuelve a intentarlo en unos minutos.';
      }
    }

    await signOut(auth);
    return { user: userCredential.user, error: null, warning };
  } catch (error) {
    return { user: null, error: getErrorMessage(error as AuthError), warning: null };
  }
}

export async function signInWithMicrosoft(options: SignInOptions = {}): Promise<AuthResult> {
  if (!isFirebaseConfigComplete || !isFirebaseReady || !auth) return authUnavailable();

  try {
    const provider = new OAuthProvider('microsoft.com');
    const userCredential = await signInWithPopup(auth, provider);

    await mintSessionCookie(userCredential.user, {
      rememberDevice: options.rememberDevice,
    });

    return { user: userCredential.user, error: null, warning: null };
  } catch (error) {
    return { user: null, error: getErrorMessage(error as AuthError), warning: null };
  }
}

export async function clearStaleFirebaseSession() {
  if (!isFirebaseReady || !auth) return;

  try {
    await signOut(auth);
  } catch (error) {
    console.warn('[holded auth] failed to clear stale Firebase session', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function clearHoldedServerSession() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.warn('[holded auth] failed to clear holded server session', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function resetHoldedAuthState() {
  await Promise.all([clearStaleFirebaseSession(), clearHoldedServerSession()]);
}

export async function ensureCurrentFirebaseUserStillExists() {
  if (!isFirebaseReady || !auth?.currentUser) {
    return { ok: false as const, reason: 'missing' as const };
  }

  try {
    await reload(auth.currentUser);
    return { ok: true as const, user: auth.currentUser };
  } catch (error) {
    const authError = error as AuthError;
    const staleCodes = new Set([
      'auth/user-not-found',
      'auth/user-disabled',
      'auth/user-token-expired',
      'auth/invalid-user-token',
      'auth/network-request-failed',
    ]);

    if (staleCodes.has(authError.code)) {
      await clearStaleFirebaseSession();
      return {
        ok: false as const,
        reason: authError.code === 'auth/network-request-failed' ? 'network' : 'stale',
      };
    }

    throw error;
  }
}

export async function findSignInMethodsForEmail(email: string) {
  if (!isFirebaseReady || !auth) return [];

  try {
    return await fetchSignInMethodsForEmail(auth, email);
  } catch (error) {
    console.warn('[holded auth] failed to fetch sign-in methods', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function requestPasswordReset(email: string) {
  if (!isFirebaseConfigComplete || !isFirebaseReady || !auth) {
    return {
      ok: false as const,
      error: authUnavailable().error,
    };
  }

  try {
    await sendPasswordResetEmail(auth, email);
    return { ok: true as const, error: null };
  } catch (error) {
    return {
      ok: false as const,
      error: getErrorMessage(error as AuthError),
    };
  }
}
