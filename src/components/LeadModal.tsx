"use client";

import { useEffect, useMemo, useState } from "react";

type Interest =
  | "register"
  | "login"
  | "demo"
  | "trial"
  | "guide"
  | "webinar"
  | "resources";

export function LeadModal() {
  const [open, setOpen] = useState(false);
  const [interest, setInterest] = useState<Interest>("register");
  const [status, setStatus] = useState<{ msg: string; state?: "pending" | "success" | "error" }>({ msg: "" });

  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.("[data-lead-open]") as HTMLElement | null;
      if (!btn) return;
      const i = (btn.getAttribute("data-lead-open") || "register") as Interest;
      setInterest(i);
      setStatus({ msg: "" });
      setOpen(true);
      document.body.classList.add("is-modal-open");
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    const onEsc = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") close();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  function close() {
    setOpen(false);
    document.body.classList.remove("is-modal-open");
  }

  const statusClass = useMemo(() => {
    if (!status.state) return "lead-form__status";
    return `lead-form__status is-${status.state}`;
  }, [status.state]);

  async function onSubmit(formData: FormData) {
    setStatus({ msg: "Enviando solicitud...", state: "pending" });
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/send-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as any;

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "No se pudo enviar la solicitud.");
      }

      setStatus({ msg: "¡Gracias! Te contactaremos muy pronto.", state: "success" });
    } catch (err) {
      setStatus({
        msg: err instanceof Error ? err.message : "No se pudo enviar. Inténtalo más tarde.",
        state: "error",
      });
    }
  }

  return (
    <div className="lead-modal" id="lead-modal" aria-hidden={!open}>
      <div className="lead-modal__backdrop" onClick={close} />
      <div className="lead-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
        <button className="lead-modal__close" type="button" aria-label="Cerrar formulario" onClick={close}>
          ×
        </button>

        <h2 id="lead-modal-title">Conversemos sobre Veri*Factu Business</h2>
        <p className="lead-modal__intro">
          Déjanos tus datos y activaremos el flujo adecuado: acceso a la plataforma, demo con Isaak o configuración guiada.
        </p>

        <form className="lead-form" action={onSubmit}>
          <input type="hidden" name="interest" value={interest} />

          <div className="lead-form__grid">
            <label className="lead-form__field">
              <span>Nombre completo</span>
              <input type="text" name="name" placeholder="María García" required />
            </label>

            <label className="lead-form__field">
              <span>Correo electrónico</span>
              <input type="email" name="email" placeholder="tu@empresa.com" required />
            </label>
          </div>

          <label className="lead-form__field">
            <span>Empresa</span>
            <input type="text" name="company" placeholder="Nombre de tu empresa" />
          </label>

          <label className="lead-form__field">
            <span>Cuéntanos qué necesitas</span>
            <textarea name="message" rows={4} placeholder="Quiero automatizar mis facturas y validar con AEAT..." />
          </label>

          <div className="lead-form__footer">
            <p className="lead-form__hint">
              Usaremos estos datos para responder desde <strong>soporte@verifactu.business</strong>.
            </p>
            <button className="btn btn--primary" type="submit">
              Enviar solicitud
            </button>
          </div>

          <p className={statusClass} role="status" aria-live="polite">
            {status.msg}
          </p>
        </form>
      </div>
    </div>
  );
}