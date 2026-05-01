import PlaceholderPage from '../_components/PlaceholderPage';

export const dynamic = 'force-dynamic';

export default function AdminMetricsPage() {
  return (
    <PlaceholderPage
      title="Métricas"
      description="Datos de crecimiento, retención, activación y uso del producto. Próximamente: gráficas de evolución mensual, cohortes de usuarios y análisis de conversión."
      actions={[
        { label: 'Ir al panel principal', href: '/panel' },
        { label: 'Ver usuarios', href: '/users' },
      ]}
    />
  );
}
