import PlaceholderPage from "../../../_components/PlaceholderPage";

export default function TenantIntegrationsPage() {
  return (
    <PlaceholderPage
      title="Integraciones del tenant"
      description="Estado de integraciones activas para este tenant."
      legacyHref="/integrations"
      actions={[
        { label: "Stripe", href: "/integrations/stripe" },
        { label: "Resend", href: "/integrations/resend" },
        { label: "Veri*Factu", href: "/integrations/verifactu" },
      ]}
    />
  );
}
