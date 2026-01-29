import PlaceholderPage from "../_components/PlaceholderPage";

export default function OperationsPage() {
  return (
    <PlaceholderPage
      title="Operaciones"
      description="Monitoreo global de procesos, jobs y webhooks."
      actions={[
        { label: "Jobs", href: "/operations/jobs" },
        { label: "Webhooks", href: "/operations/webhooks" },
        { label: "Errores", href: "/operations/errors" },
      ]}
    />
  );
}
