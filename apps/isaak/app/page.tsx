import type { Metadata } from 'next';
import IsaakPublicPhase1Landing from './components/IsaakPublicPhase1Landing';

export const metadata: Metadata = {
  title: 'Isaak | Orquestador empresarial inteligente',
  description:
    'Conecta Excel, ERP, facturacion, bancos y documentos para entender y ejecutar tareas empresariales con permisos y trazabilidad.',
};

export default function IsaakHomePage() {
  return <IsaakPublicPhase1Landing />;
}
