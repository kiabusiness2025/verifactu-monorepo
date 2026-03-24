import type { User } from 'firebase/auth';
import {
  type AuthError,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, isFirebaseConfigComplete, isFirebaseReady } from './firebase';
import { mintSessionCookie } from './serverSession';

type SignInOptions = {
  rememberDevice?: boolean;
};

export interface AuthErrorMessage {
  code: string;
  message: string;
  userMessage: string;
}

type AuthResult = { user: User; error: null } | { user: null; error: AuthErrorMessage };

const authUnavailable = (): AuthResult => ({
  user: null,
  error: {
    code: 'auth/config-unavailable',
    message: 'Auth not initialized',
    userMessage: 'El acceso no está disponible ahora mismo. Revisa la configuración del proyecto.',
  },
});

function getErrorMessage(error: AuthError): AuthErrorMessage {
  const errorMap: Record<string, { message: string; userMessage: string }> = {
    'auth/invalid-email': {
      message: 'Invalid email format',
      userMessage: 'El correo no es válido. Revísalo e inténtalo de nuevo.',
    },
    'auth/user-not-found': {
      message: 'User not found',
      userMessage: 'No encontramos una cuenta con ese correo.',
    },
    'auth/wrong-password': {
      message: 'Wrong password',
      userMessage: 'La contraseña no coincide. Inténtalo de nuevo.',
    },
    'auth/popup-closed-by-user': {
      message: 'Popup closed',
      userMessage: 'Has cerrado la ventana antes de terminar el acceso.',
    },
    'auth/account-exists-with-different-credential': {
      message: 'Account exists with different credential',
      userMessage: 'Esta cuenta ya existe con otro método de acceso.',
    },
    'auth/unauthorized-domain': {
      message: 'Unauthorized domain',
      userMessage:
        'El dominio actual no está autorizado en Firebase Authentication. Añádelo en Authorized domains.',
    },
    'auth/operation-not-allowed': {
      message: 'Operation not allowed',
      userMessage:
        'El proveedor Google no está activado en Firebase Authentication para este proyecto.',
    },
    'auth/popup-blocked': {
      message: 'Popup blocked',
      userMessage:
        'El navegador bloqueó la ventana de Google. Permite popups e inténtalo de nuevo.',
    },
    'auth/cancelled-popup-request': {
      message: 'Cancelled popup request',
      userMessage: 'Se canceló el intento de acceso. Reintenta con Google.',
    },
    'auth/too-many-requests': {
      message: 'Too many requests',
      userMessage: 'Has hecho demasiados intentos. Espera un momento y vuelve a probar.',
    },
  };

  const mapped = errorMap[error.code] || {
    message: error.message,
    userMessage: 'No hemos podido completar el acceso. Intenta de nuevo dentro de unos minutos.',
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
      };
    }

    await mintSessionCookie(userCredential.user, {
      rememberDevice: options.rememberDevice,
    });

    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: getErrorMessage(error as AuthError) };
  }
}

export async function signInWithGoogle(options: SignInOptions = {}): Promise<AuthResult> {
  if (!isFirebaseConfigComplete || !isFirebaseReady || !auth) return authUnavailable();

  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);

    await mintSessionCookie(userCredential.user, {
      rememberDevice: options.rememberDevice,
    });

    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: getErrorMessage(error as AuthError) };
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

    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: getErrorMessage(error as AuthError) };
  }
}
