import { permanentRedirect } from 'next/navigation';

// Documentación histórica superseded por /conectores/claude/docs (canónica en
// sitemap y en la submission de Anthropic). Redirect 308 por bookmarks externos.
export default function DocsClaudeLegacyPage() {
  permanentRedirect('/conectores/claude/docs');
}
