@echo off
cd /d c:\dev\verifactu-monorepo
git add apps/app/app/api/tenant/logo/route.ts apps/app/components/layout/Topbar.tsx apps/app/app/dashboard/settings/page.tsx db/migrations/add_tenant_logo.sql scripts/check-and-apply-logo-migration.js brand/app/empresa-demo-logo.svg storage.rules
git commit -m "fix: Corregir sistema de logos con imports de Firebase correctos"
git push origin main
git log --oneline -1
