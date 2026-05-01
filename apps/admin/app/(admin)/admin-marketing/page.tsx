import PlaceholderPage from '../_components/PlaceholderPage';

export const dynamic = 'force-dynamic';

export default function AdminMarketingPage() {
  return (
    <PlaceholderPage
      title="Marketing"
      description="Gestión de comunicaciones de marketing: campañas de correo, publicaciones en redes sociales y elaboración de vídeos demostrativos para YouTube."
      actions={[
        { label: 'Ver usuarios', href: '/users' },
        { label: 'Ver tenants', href: '/tenants' },
      ]}
    />
  );
}
