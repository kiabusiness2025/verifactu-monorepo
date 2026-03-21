import { PLAN_LIST } from '../../lib/plans';
import { PlanPageTemplate } from '../_shared';

export default function PlanBasicoPage() {
  const plan = PLAN_LIST.find((item) => item.id === 'basico');
  if (!plan) return null;

  return (
    <PlanPageTemplate
      title="Básico: control simple para empezar"
      subtitle="Ideal para autónomos y microempresas que quieren emitir y registrar sin complejidad."
      plan={plan}
    />
  );
}
