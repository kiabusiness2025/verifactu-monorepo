# Firebase Remote Config Implementation Guide

## Overview

Firebase Remote Config allows you to modify the behavior and appearance of your app without distributing an update. This guide explains how to use Remote Config in the VeriFactu web app.

## Architecture

### Components

1. **Firebase Initialization** (`apps/app/lib/firebase.ts`)
   - Initializes Firebase Remote Config
   - Defines default values
   - Configures fetch intervals

2. **Remote Config Utilities** (`apps/app/lib/remoteConfig.ts`)
   - Core functions for fetching and accessing config values
   - Real-time update listeners
   - Type-safe value accessors

3. **React Hooks** (`apps/app/hooks/useRemoteConfig.ts`)
   - `useRemoteConfig()` - Main hook with refresh capability
   - `useFeatureFlag()` - Specialized hook for boolean flags
   - `useMaintenanceMode()` - Predefined hook for maintenance mode

## Default Configuration Parameters

### Feature Flags
- `feature_isaak_chat` - Enable/disable Isaak chat
- `feature_isaak_proactive` - Enable Isaak proactive messages
- `feature_isaak_deadlines` - Enable deadline notifications
- `feature_new_dashboard` - Enable experimental dashboard
- `feature_advanced_reporting` - Enable advanced analytics

### UI Configuration
- `ui_theme_primary_color` - Primary brand color (hex)
- `ui_show_onboarding` - Show onboarding flow for new users
- `ui_max_companies_per_user` - Max companies per user
- `ui_maintenance_mode` - Enable maintenance mode
- `ui_maintenance_message` - Maintenance message text

### Email Settings
- `resend_enabled` - Enable Resend email service
- `resend_from_email` - From email address
- `resend_max_recipients` - Max recipients per send

### eInforma Settings
- `einforma_enabled` - Enable eInforma company search
- `einforma_timeout_ms` - API timeout milliseconds
- `einforma_api_version` - API version to use

### Invoice Settings
- `invoice_max_upload_size_mb` - Max upload file size
- `invoice_default_export_format` - Default export format (pdf/xml)
- `invoice_retention_days` - How long to retain invoices

### Business Logic
- `pricing_free_tier_invoice_limit` - Free tier invoice limit
- `pricing_trial_days` - Trial period length
- `pricing_enterprise_enabled` - Enable enterprise features

### API & Backend
- `api_base_url` - Base API endpoint
- `api_request_timeout_ms` - Request timeout
- `database_sync_interval_ms` - Sync interval

### Messages
- `welcome_message` - Welcome message text
- `support_email` - Support email address
- `support_phone` - Support phone number

## Usage Examples

### Basic Usage - Get a Feature Flag

```typescript
'use client';

import { useFeatureFlag } from '@/hooks/useRemoteConfig';

export function MyComponent() {
  const isaakEnabled = useFeatureFlag('feature_isaak_chat');
  
  if (!isaakEnabled) {
    return <div>Isaak is disabled</div>;
  }

  return <IsaakChat />;
}
```

### Get Any Configuration Value

```typescript
'use client';

import { useRemoteConfig } from '@/hooks/useRemoteConfig';

export function ConfigDisplay() {
  const { 
    isLoading, 
    getFeatureFlag, 
    getString, 
    getNumber 
  } = useRemoteConfig();

  if (isLoading) {
    return <div>Loading config...</div>;
  }

  const maxCompanies = getNumber('ui_max_companies_per_user');
  const supportEmail = getString('support_email');
  const darkMode = getFeatureFlag('ui_dark_mode');

  return (
    <div>
      <p>Max Companies: {maxCompanies}</p>
      <p>Support: {supportEmail}</p>
      <p>Dark Mode: {darkMode ? 'Enabled' : 'Disabled'}</p>
    </div>
  );
}
```

### Check Maintenance Mode

```typescript
'use client';

import { useMaintenanceMode } from '@/hooks/useRemoteConfig';

export function AppLayout() {
  const { enabled, message } = useMaintenanceMode();

  if (enabled) {
    return (
      <div className="maintenance-banner">
        <h2>Maintenance Mode</h2>
        <p>{message}</p>
      </div>
    );
  }

  return <YourNormalApp />;
}
```

### Server-Side Usage

For server components, you can use the utility functions directly:

```typescript
import { getFeatureFlag, getRemoteString } from '@/lib/remoteConfig';
import { initRemoteConfig } from '@/lib/remoteConfig';

export async function ServerComponent() {
  // Initialize remote config (safe to call multiple times)
  await initRemoteConfig();

  // Get values
  const email = getRemoteString('support_email');
  const maxSize = getRemoteNumber('invoice_max_upload_size_mb');

  return (
    <div>
      <p>Contact: {email}</p>
      <p>Max Upload: {maxSize}MB</p>
    </div>
  );
}
```

## Firebase Console Configuration

### Step 1: Navigate to Remote Config
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Remote Config** in the left menu

### Step 2: Add Parameters
1. Click **Create Parameter**
2. Enter parameter name (e.g., `feature_isaak_chat`)
3. Set parameter type (String, Boolean, Number, JSON)
4. Enter default value
5. (Optional) Add conditional values for specific user segments
6. Click **Save**

### Step 3: Configure Conditions (Optional)
You can use conditions to serve different values based on:
- User properties (custom claims)
- App version
- Device type
- User percentage

Example custom signals:
```typescript
setCustomSignals(remoteConfig, {
  "city": "Madrid",
  "plan_type": "enterprise"
});
```

### Step 4: Publish
Click **Publish Changes** to deploy your configuration to all users.

## Real-Time Updates

Remote Config now supports **real-time listeners** that automatically fetch and apply updates when they're published:

```typescript
'use client';

import { useEffect } from 'react';
import { useRemoteConfig } from '@/hooks/useRemoteConfig';

export function MyComponent() {
  const { isLoading, refresh } = useRemoteConfig();

  useEffect(() => {
    // Refresh config every 5 minutes
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (isLoading) return <div>Loading...</div>;

  return <div>Config loaded!</div>;
}
```

## Fetch Intervals

### Development
- **Minimum fetch interval**: 1 hour (3600000 ms)
- **Use case**: Rapid iteration while developing
- **When to change**: During active development, you can set lower intervals temporarily

### Production
- **Minimum fetch interval**: 12 hours (43200000 ms)
- **Use case**: Balance between fresh config and avoiding excessive API calls
- **Default**: Recommended by Google

> ⚠️ **Important**: Keep production interval at 12 hours unless you have specific business requirements. Lower intervals can hit rate limits if scaled to many users.

## Best Practices

1. **Use sensible defaults** - Default values in the code act as fallback if config fetch fails

2. **Version your parameters** - Use naming conventions:
   ```
   feature_[name] - for boolean feature flags
   ui_[name] - for UI configuration
   api_[name] - for API settings
   ```

3. **Don't store secrets** - Remote Config data is not encrypted. Never store API keys, passwords, or sensitive data

4. **Test before publishing** - Test configuration changes in dev/staging before deploying to production

5. **Monitor fetch failures** - Remote Config gracefully falls back to defaults if fetch fails, but monitor for patterns

6. **Use conditional values** - Serve different config to different user segments:
   ```
   Feature flags for beta testers
   Different pricing for different regions
   A/B testing different UI layouts
   ```

7. **Batch updates** - If making multiple changes, publish them together to minimize network traffic

## Troubleshooting

### Config Not Updating?
1. Check if Real-time API is enabled in Google Cloud Console
2. Verify fetch interval has passed (dev: 1h, prod: 12h)
3. Check browser console for errors
4. Try calling `refresh()` manually

### Values Not Applied?
1. Ensure `activate()` was called after `fetchAndActivate()`
2. Check default values are configured correctly
3. Verify parameter names match exactly

### Performance Issues?
1. Increase `minimumFetchIntervalMillis` to reduce API calls
2. Don't call `fetchAndActivate()` too frequently
3. Use selector hooks like `useFeatureFlag()` instead of fetching all values

## Environment-Specific Configuration

You can manage different configs per environment:

```typescript
// .env.local (development)
NEXT_PUBLIC_REMOTE_CONFIG_ENV=development

// .env.production (production)
NEXT_PUBLIC_REMOTE_CONFIG_ENV=production
```

Then use conditions in Firebase Console to serve different values based on environment.

## Monitoring & Logging

Remote Config operations are logged to the browser console:

```
✅ Firebase Remote Config initialized with defaults
✅ Remote Config fetched and activated: true
🔄 Remote Config updated with keys: ['feature_isaak_chat', 'ui_theme_primary_color']
✅ New Remote Config activated
```

Watch these logs to confirm your configuration is working correctly.

## References

- [Firebase Remote Config Documentation](https://firebase.google.com/docs/remote-config)
- [Firebase Remote Config Web Setup](https://firebase.google.com/docs/remote-config/get-started?hl=es&platform=web)
- [Real-time Remote Config](https://firebase.google.com/docs/remote-config/real-time-config)
