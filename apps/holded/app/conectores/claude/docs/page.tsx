// Same content as /docs/claude but exposed under the connector tree.
// We override metadata to set the canonical URL on this surface (the one users
// actually navigate to from the connector landing) — avoids duplicate-content
// SEO penalties between /docs/claude and /conectores/claude/docs.
import type { Metadata } from 'next';
import { metadata as baseMetadata } from '../../../docs/claude/page';

export { default } from '../../../docs/claude/page';

export const metadata: Metadata = {
  ...baseMetadata,
  alternates: {
    canonical: '/conectores/claude/docs',
  },
};
