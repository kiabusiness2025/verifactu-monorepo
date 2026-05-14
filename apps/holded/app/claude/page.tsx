import { permanentRedirect } from 'next/navigation';

// Landing histórica superseded por /conectores/claude (canónica en sitemap y
// en la submission de Anthropic). Se mantiene como redirect 308 por bookmarks
// externos.
export default function ClaudeLegacyLandingPage() {
  permanentRedirect('/conectores/claude');
}
