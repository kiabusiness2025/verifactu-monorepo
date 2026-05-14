import { permanentRedirect } from 'next/navigation';

// Documentación histórica superseded por /conectores/chatgpt/docs (canónica en
// sitemap y en la submission de OpenAI). Redirect 308 por bookmarks externos.
export default function DocsChatgptLegacyPage() {
  permanentRedirect('/conectores/chatgpt/docs');
}
