import PlaceholderPage from "../_components/PlaceholderPage";

export default function SupportSessionsPage() {
  return (
    <PlaceholderPage
      title="Support Sessions"
      description="Gestiona sesiones de soporte con handoff seguro al panel del cliente."
      actions={[
        { label: "Iniciar sesion", href: "/api/admin/support-sessions/start" },
        { label: "Finalizar sesion", href: "/api/admin/support-sessions/stop" },
      ]}
    />
  );
}
