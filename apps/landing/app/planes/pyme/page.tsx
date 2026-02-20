import { PLAN_LIST } from "../../lib/plans";
import { PlanPageTemplate } from "../_shared";

export default function PlanPymePage() {
  const plan = PLAN_LIST.find((item) => item.id === "pyme");
  if (!plan) return null;

  return (
    <PlanPageTemplate
      title="PYME: más capacidad con control diario"
      subtitle="Pensado para equipos que necesitan más volumen y seguimiento continuo del negocio."
      plan={plan}
    />
  );
}
