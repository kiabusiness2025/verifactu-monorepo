import PlaceholderPage from '../_components/PlaceholderPage';

export const dynamic = 'force-dynamic';

export default function AdminMeetingsPage() {
  return (
    <PlaceholderPage
      title="Reuniones"
      description="Citas y reuniones con nuevos clientes potenciales. Aquí podrás ver el calendario de demos, registrar el resultado de cada reunión y hacer seguimiento del pipeline."
      actions={[
        { label: 'Ver demos solicitadas', href: '/demo-requests' },
        { label: 'Ver panel', href: '/panel' },
      ]}
    />
  );
}
