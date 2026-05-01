import PlaceholderPage from '../_components/PlaceholderPage';

export const dynamic = 'force-dynamic';

export default function AdminDocsPage() {
  return (
    <PlaceholderPage
      title="Documentación pública"
      description="Gestión de la documentación pública del producto: guías de uso, referencia de la API, preguntas frecuentes y tutoriales en vídeo."
      actions={[
        { label: 'Ver panel', href: '/panel' },
        { label: 'Ver marketing', href: '/admin-marketing' },
      ]}
    />
  );
}
