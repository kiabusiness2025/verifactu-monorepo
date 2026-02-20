import { PLAN_LIST } from "../../lib/plans";
import { PlanPageTemplate } from "../_shared";

export default function PlanProPage() {
  const plan = PLAN_LIST.find((item) => item.id === "pro");
  if (!plan) return null;

  return (
    <PlanPageTemplate
      title="Pro: máximo volumen y soporte prioritario"
      subtitle="Para operaciones intensivas que necesitan margen, prioridad y continuidad."
      plan={plan}
    />
  );
}
