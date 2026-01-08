"use client";

import { useState, useEffect } from "react";

/**
 * Hook para obtener el rol del usuario desde la sesión
 * 
 * En el futuro, esto se obtendrá de:
 * - Token JWT decodificado (custom claims de Firebase)
 * - API endpoint que devuelva el perfil del usuario
 * - Base de datos con relación user_id -> role
 * 
 * Por ahora, retorna rol por defecto 'user'
 */
export function useUserRole() {
  const [role, setRole] = useState<string>("user");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Obtener rol real del usuario
    // Opción 1: Custom claims en Firebase token
    // const auth = getAuth();
    // const user = auth.currentUser;
    // if (user) {
    //   const token = await user.getIdTokenResult();
    //   setRole(token.claims.role || 'user');
    // }
    //
    // Opción 2: Endpoint API
    // const res = await fetch('/api/user/profile');
    // const data = await res.json();
    // setRole(data.role);
    
    // Mock: asignar rol desde localStorage o default
    const savedRole = localStorage.getItem("user_role") || "user";
    setRole(savedRole);
    setIsLoading(false);
  }, []);

  /**
   * Verifica si el usuario tiene uno de los roles permitidos
   */
  const hasRole = (allowedRoles?: string[]) => {
    if (!allowedRoles || allowedRoles.length === 0) {
      return true; // Sin restricción de roles
    }
    return allowedRoles.includes(role);
  };

  return { role, isLoading, hasRole };
}
