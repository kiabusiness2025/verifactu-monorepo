import { prisma } from '@/app/lib/prisma';

/**
 * Comprueba si el perfil de onboarding de Holded está completo para un usuario y tenant dados.
 * Devuelve true si el perfil está completo, false si falta información.
 */
export async function isHoldedProfileComplete({
  tenantId,
  userId,
}: {
  tenantId: string;
  userId: string;
}): Promise<boolean> {
  // getHoldedOnboardingState es un alias de getIsaakOnboardingState
  const state = await getHoldedOnboardingState({ prisma, tenantId, userId });
  return Boolean(state.completed);
}
export {
  completeIsaakOnboarding as completeHoldedOnboardingProfile,
  getIsaakOnboardingState as getHoldedOnboardingState,
  saveIsaakOnboardingDraft as saveHoldedOnboardingDraft,
  type HoldedContextSnapshot,
  type IsaakMainGoal as HoldedOnboardingMainGoal,
  type IsaakOnboardingProfileInput as HoldedOnboardingProfileInput,
  type IsaakRoleInCompany as HoldedOnboardingRoleInCompany,
} from '@verifactu/integrations';
