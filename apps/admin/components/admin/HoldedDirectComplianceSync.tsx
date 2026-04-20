'use client';

import { useEffect } from 'react';

export default function HoldedDirectComplianceSync() {
  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/admin/holded-direct/profile-compliance/sync', {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal,
    }).catch(() => {
      // Silent by design: panel data remains visible even if reminder sync fails.
    });

    return () => controller.abort();
  }, []);

  return null;
}
