import PlaceholderPage from '../_components/PlaceholderPage';

export const dynamic = 'force-dynamic';

export default function AdminSupportPage() {
  return (
    <PlaceholderPage
      title="Soporte"
      description="Todos los tickets de soporte de los usuarios. Revisa, asigna y responde consultas desde aquí."
      legacyHref="/tickets"
      actions={[
        { label: 'Ver tickets (vista completa)', href: '/tickets' },
        { label: 'Sesiones de soporte', href: '/support-sessions' },
      ]}
    />
  );
}
