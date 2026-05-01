import PlaceholderPage from '../_components/PlaceholderPage';

export const dynamic = 'force-dynamic';

export default function AdminOrdersPage() {
  return (
    <PlaceholderPage
      title="Pedidos"
      description="Cola de pedidos de todos los tenants. Aquí gestionarás el estado, fulfillment y asignación de cada pedido recibido."
      actions={[
        { label: 'Ver tickets de soporte', href: '/admin-support' },
        { label: 'Ver tenants', href: '/tenants' },
      ]}
    />
  );
}
