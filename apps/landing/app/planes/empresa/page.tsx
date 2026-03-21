import { PLAN_LIST } from '../../lib/plans';
import { PlanPageTemplate } from '../_shared';

export default function PlanEmpresaPage() {
  const plan = PLAN_LIST.find((item) => item.id === 'empresa');
  if (!plan) return null;

  return (
    <PlanPageTemplate
      title="Empresa: operaciones conectadas con asesoría"
      subtitle="Para empresas que quieren flujo estable y conexión con su entorno contable."
      plan={plan}
    />
  );
}
