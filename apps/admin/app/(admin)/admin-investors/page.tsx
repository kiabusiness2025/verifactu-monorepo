import PlaceholderPage from '../_components/PlaceholderPage';

export const dynamic = 'force-dynamic';

export default function AdminInvestorsPage() {
  return (
    <PlaceholderPage
      title="Inversores"
      description="Apartado privado para inversores y accionistas. Documentos, actualizaciones de negocio, métricas clave y comunicaciones específicas para este colectivo."
      actions={[
        { label: 'Ver métricas', href: '/admin-metrics' },
        { label: 'Ver panel', href: '/panel' },
      ]}
    />
  );
}
