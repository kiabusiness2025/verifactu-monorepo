import { getExpenseCategories } from '@/lib/db-queries';

type ExpenseCategory = {
  id: number;
  code: string;
  name: string;
  is_deductible: boolean;
};

export async function classifyExpense(description: string): Promise<ExpenseCategory | undefined> {
  const categories = await getExpenseCategories();
  const lower = description.toLowerCase();
  let matchedCategory = categories.find((cat) => cat.code === 'other');

  if (lower.includes('alquiler') || lower.includes('oficina')) {
    matchedCategory = categories.find((cat) => cat.code === 'office');
  } else if (
    lower.includes('software') ||
    lower.includes('suscripción') ||
    lower.includes('licencia')
  ) {
    matchedCategory = categories.find((cat) => cat.code === 'software');
  } else if (lower.includes('publicidad') || lower.includes('marketing')) {
    matchedCategory = categories.find((cat) => cat.code === 'marketing');
  } else if (lower.includes('viaje') || lower.includes('gasolina') || lower.includes('hotel')) {
    matchedCategory = categories.find((cat) => cat.code === 'travel');
  } else if (lower.includes('asesor') || lower.includes('gestor') || lower.includes('abogado')) {
    matchedCategory = categories.find((cat) => cat.code === 'professional');
  } else if (lower.includes('seguro')) {
    matchedCategory = categories.find((cat) => cat.code === 'insurance');
  } else if (lower.includes('impuesto') || lower.includes('tasa')) {
    matchedCategory = categories.find((cat) => cat.code === 'taxes');
  } else if (lower.includes('banco') || lower.includes('comisión')) {
    matchedCategory = categories.find((cat) => cat.code === 'banking');
  } else if (lower.includes('formación') || lower.includes('curso')) {
    matchedCategory = categories.find((cat) => cat.code === 'training');
  }

  return matchedCategory;
}
