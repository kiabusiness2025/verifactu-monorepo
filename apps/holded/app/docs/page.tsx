import { permanentRedirect } from 'next/navigation';

// El árbol /docs/* quedó superseded por /conectores/{conector}/docs. Este
// índice redirige al hub de documentación de conectores.
export default function DocsPage() {
  permanentRedirect('/conectores/docs');
}
