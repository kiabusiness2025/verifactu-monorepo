"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";

type Status = {
  tone: "idle" | "success" | "error";
  message: string;
};

export default function SignUpPage() {
  const [status, setStatus] = useState<Status>({ tone: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ tone: "idle", message: "" });

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Algo salió mal durante el registro.");
      }

      // Si el registro es exitoso, iniciamos sesión automáticamente
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setStatus({ tone: "error", message: "Registro exitoso, pero no se pudo iniciar sesión. Por favor, accede manualmente." });
      } else {
        // Redirigir al dashboard o a la página principal tras el éxito
        window.location.href = "/";
      }

    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Error desconocido.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page" style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "var(--color-slate-100)" }}>
      <div className="login-card" style={{ background: "var(--color-white)", padding: "40px", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-card)", width: "min(420px, 90vw)", textAlign: "center" }}>
        <a href="/" aria-label="Volver al inicio">
          <img src="/assets/verifactu-logo-animated.svg" alt="VeriFactu Business" style={{ height: "40px", margin: "0 auto 24px" }} />
        </a>
        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px" }}>Crea tu cuenta</h1>
        <p style={{ color: "var(--color-slate-600)", marginTop: 0 }}>Comienza tu prueba gratuita de 30 días.</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left", marginTop: "32px" }}>
          <label className="lead-form__field">
            <span>Nombre</span>
            <input name="name" type="text" placeholder="Tu nombre" required />
          </label>
          <label className="lead-form__field">
            <span>Email</span>
            <input name="email" type="email" placeholder="tu@email.com" required />
          </label>
          <label className="lead-form__field">
            <span>Contraseña</span>
            <input name="password" type="password" required />
          </label>

          <button type="submit" className="btn btn--primary" style={{ marginTop: "8px" }} disabled={isSubmitting}>
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta gratis"}
          </button>
        </form>

        {status.message && (
          <p style={{ marginTop: "16px", color: status.tone === "error" ? "#dc2626" : "#16a34a" }}>
            {status.message}
          </p>
        )}

        <p style={{ marginTop: "24px", fontSize: "14px", color: "var(--color-slate-600)" }}>
          ¿Ya tienes una cuenta?{" "}
          <a href="/auth/signin" style={{ color: "var(--color-primary-600)" }}>
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}