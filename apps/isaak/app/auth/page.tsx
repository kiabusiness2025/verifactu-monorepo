// Página /auth en isaak.chat — redirect server-side directo al modal
// OAuth del landing. Antes mostraba un botón "Entrar a Isaak" intermedio
// que obligaba al usuario a un click extra antes de ver Google/Microsoft.
//
// La UX previa (un modal con solo "Entrar") sobrevive como fallback no
// JS / por accesibilidad: si el redirect no se ejecuta (cliente sin JS,
// crawler), la página igualmente renderiza el enlace en `<noscript>`-like
// estilo y el usuario puede continuar manualmente.

import { redirect } from 'next/navigation';
import { buildIsaakAuthUrl, ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';

export const metadata = {
  title: 'Acceder — Isaak',
  description: 'Inicia sesión en Isaak, tu copiloto fiscal inteligente.',
};

type SearchParams = { signup?: string; next?: string };

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const next = params.next ?? `${ISAAK_PUBLIC_URL}/chat`;
  const baseUrl = buildIsaakAuthUrl('isaak_auth_page', next);
  const loginUrl = params.signup === '1' ? `${baseUrl}&signup=1` : baseUrl;
  redirect(loginUrl);
}
