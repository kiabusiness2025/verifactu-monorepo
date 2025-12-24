import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  confirmPasswordReset,
  sendEmailVerification,
  signOut,
  User,
  AuthError,
} from "firebase/auth";
import { auth } from "./firebase";

// Type for auth errors with custom messages
export interface AuthErrorMessage {
  code: string;
  message: string;
  userMessage: string;
}

// Map Firebase error codes to user-friendly messages
const getErrorMessage = (error: AuthError): AuthErrorMessage => {
  const errorMap: Record<string, { message: string; userMessage: string }> = {
    "auth/email-already-in-use": {
      message: "Email already registered",
      userMessage: "Este correo ya está registrado. ¿Intentaste con otro?",
    },
    "auth/invalid-email": {
      message: "Invalid email format",
      userMessage: "El correo no es válido. Verifica que esté bien escrito.",
    },
    "auth/weak-password": {
      message: "Password too weak",
      userMessage: "La contraseña es muy débil. Usa al menos 8 caracteres.",
    },
    "auth/user-not-found": {
      message: "User not found",
      userMessage: "No encontramos una cuenta con este correo.",
    },
    "auth/wrong-password": {
      message: "Wrong password",
      userMessage: "Contraseña incorrecta. Intenta de nuevo.",
    },
    "auth/too-many-requests": {
      message: "Too many login attempts",
      userMessage: "Has intentado demasiadas veces. Espera un momento e intenta después.",
    },
    "auth/popup-closed-by-user": {
      message: "Popup closed",
      userMessage: "Cancelaste el acceso con Google.",
    },
    "auth/account-exists-with-different-credential": {
      message: "Account exists with different credential",
      userMessage: "Esta cuenta ya existe con otro método de inicio de sesión.",
    },
  };

  const mapped = errorMap[error.code] || {
    message: error.message,
    userMessage: "Hubo un error. Intenta de nuevo más tarde.",
  };

  return {
    code: error.code,
    message: mapped.message,
    userMessage: mapped.userMessage,
  };
};

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<{ user: User; error: null } | { user: null; error: AuthErrorMessage }> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Send verification email
    try {
      await sendEmailVerification(userCredential.user);
    } catch (verifyError) {
      console.warn("Could not send verification email:", verifyError);
    }

    return { user: userCredential.user, error: null };
  } catch (error) {
    return {
      user: null,
      error: getErrorMessage(error as AuthError),
    };
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<{ user: User; error: null } | { user: null; error: AuthErrorMessage }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Check if email is verified
    if (!userCredential.user.emailVerified) {
      return {
        user: null,
        error: {
          code: "auth/email-not-verified",
          message: "Email not verified",
          userMessage: "Por favor verifica tu correo antes de continuar. Revisa tu bandeja de entrada.",
        },
      };
    }

    return { user: userCredential.user, error: null };
  } catch (error) {
    return {
      user: null,
      error: getErrorMessage(error as AuthError),
    };
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<
  { user: User; error: null } | { user: null; error: AuthErrorMessage }
> => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);

    return { user: userCredential.user, error: null };
  } catch (error) {
    return {
      user: null,
      error: getErrorMessage(error as AuthError),
    };
  }
};

/**
 * Send password reset email
 */
export const sendResetEmail = async (
  email: string
): Promise<{ success: boolean; error: null } | { success: false; error: AuthErrorMessage }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error as AuthError),
    };
  }
};

/**
 * Reset password with code
 */
export const resetPasswordWithCode = async (
  code: string,
  newPassword: string
): Promise<{ success: boolean; error: null } | { success: false; error: AuthErrorMessage }> => {
  try {
    await confirmPasswordReset(auth, code, newPassword);
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error as AuthError),
    };
  }
};

/**
 * Resend email verification
 */
export const resendVerificationEmail = async (
  user: User
): Promise<{ success: boolean; error: null } | { success: false; error: AuthErrorMessage }> => {
  try {
    await sendEmailVerification(user);
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error as AuthError),
    };
  }
};

/**
 * Sign out
 */
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

/**
 * Get current auth state
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};
