'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/firebase';
import { logEvent } from 'firebase/analytics';

export function FirebaseAnalytics() {
  useEffect(() => {
    if (analytics) {
      // Log page view
      logEvent(analytics, 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
      
      console.log('📊 Firebase Analytics initialized and tracking page views');
    }
  }, []);

  return null; // Este componente no renderiza nada
}

// Utility functions para usar en toda la app
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  }
};

export const trackLogin = (method: string) => {
  if (analytics) {
    logEvent(analytics, 'login', { method });
  }
};

export const trackSignup = (method: string) => {
  if (analytics) {
    logEvent(analytics, 'sign_up', { method });
  }
};

export const trackInvoiceCreated = (tenantId: string) => {
  if (analytics) {
    logEvent(analytics, 'invoice_created', { tenant_id: tenantId });
  }
};

export const trackFeatureUsed = (featureName: string) => {
  if (analytics) {
    logEvent(analytics, 'feature_used', { feature_name: featureName });
  }
};
