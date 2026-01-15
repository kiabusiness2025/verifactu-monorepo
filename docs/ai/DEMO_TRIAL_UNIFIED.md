# Sistema Unificado: Demo y Trial

**Fecha:** 2026-01-15  
**Estado:** Diseño aprobado

---

## 🎯 Concepto Unificado

**Premisa:** "Demo" y "Trial/Prueba" son **el mismo proceso** internamente.

Solo cambian:
- Punto de entrada (botón en landing)
- Mensajes públicos de marketing
- Copy en CTAs

Ambos crean:
- ✅ Usuario autenticado con Google
- ✅ Empresa "Demo SL" con datos de ejemplo
- ✅ Período de trial de 14 días
- ✅ Onboarding guiado por Isaak

---

## 🏢 Empresa Demo SL - Características

### Datos de la Empresa
```typescript
{
  name: "Demo SL",
  legal_name: "EMPRESA DEMO SOCIEDAD LIMITADA",
  tax_id: "B99999999", // CIF ficticio pero válido
  is_demo: true, // Flag especial
  trial_ends_at: new Date(+14 días),
  created_at: now
}
```

### Datos de Ejemplo Incluidos

**Facturas (3):**
```
F-2026-001 | 2026-01-05 | Acme Corp      | 12.500€ | Pagada
F-2026-002 | 2026-01-07 | TechStart SL   |  8.400€ | Pendiente
F-2026-003 | 2026-01-08 | Design Studio  |  5.600€ | Pagada

Total facturado: 26.500€
```

**Gastos (3):**
```
G-001 | 2026-01-03 | Hosting AWS        | 450€ | Servicios
G-002 | 2026-01-04 | Software licencias | 890€ | Tecnología
G-003 | 2026-01-06 | Material oficina   | 120€ | Suministros

Total gastos: 1.460€
```

**Resumen:**
- 💰 Ingresos: 26.500€
- 📉 Gastos: 1.460€
- ✅ **Beneficio: 25.040€**
- 📊 Margen: 94%

**Clientes (3):**
```
Acme Corp
TechStart SL
Design Studio
```

---

## 🔄 Flujos de Entrada

### Flujo 1: "Solicitar Demo" (landing)
```
Usuario hace click en "Solicitar Demo"
          ↓
Formulario con:
- Nombre
- Email
- Empresa (opcional)
- Teléfono (opcional)
          ↓
Mensaje: "¡Perfecto! Para mostrarte la demo necesitamos crear tu cuenta."
          ↓
Botón: "Acceder con Google"
          ↓
[Mismo proceso que Trial]
```

### Flujo 2: "Probar Gratis" (landing CTA principal)
```
Usuario hace click en "Probar Gratis 14 días"
          ↓
Mensaje: "Crea tu cuenta gratis y prueba todas las funciones."
          ↓
Botón: "Acceder con Google"
          ↓
[Mismo proceso que Demo]
```

### Proceso Unificado Post-Login
```
1. Usuario se autentica con Google OAuth
          ↓
2. Sistema crea/verifica usuario en DB
          ↓
3. Sistema crea empresa "Demo SL" con datos de ejemplo
          ↓
4. Crea membership (role: owner)
          ↓
5. Crea user_preferences
          ↓
6. Redirige a /dashboard
          ↓
7. Isaak inicia onboarding guiado
```

---

## 👋 Onboarding Guiado por Isaak

### Mensaje de Bienvenida
```
"¡Hola [Nombre]! 👋

Bienvenido a Verifactu.business.

He creado una empresa de ejemplo para que explores: 
📊 Demo SL

Tiene 3 facturas, 3 gastos y 3 clientes de muestra 
para que veas cómo funciona todo.

¿Quieres que te enseñe rápidamente las secciones principales?"

→ Botón: "Sí, guíame"
→ Link: "Prefiero explorar solo"
```

### Pasos del Tour (si acepta guía)
```
1. Dashboard Principal
   "Aquí ves el resumen: ventas, gastos, beneficio."
   
2. Facturas
   "Puedes crear, editar y enviar facturas Verifactu."
   
3. Gastos
   "Registra gastos manualmente o sube tickets (OCR)."
   
4. Clientes
   "Gestiona tu cartera de clientes."

5. Configuración
   "Cuando estés listo, configura tu empresa real aquí."

6. Final
   "¡Listo! Tienes 14 días para probarlo todo.
   Si necesitas ayuda, pregúntame lo que sea."
```

---

## 🗄️ Estructura de Base de Datos

### Nueva columna: `is_demo`
```sql
ALTER TABLE tenants ADD COLUMN is_demo BOOLEAN DEFAULT false;
```

### Flag en nuevas empresas
```sql
-- Al crear empresa demo
INSERT INTO tenants (
  id, name, legal_name, tax_id, is_demo, created_at
) VALUES (
  uuid_generate_v4(),
  'Demo SL',
  'EMPRESA DEMO SOCIEDAD LIMITADA',
  'B99999999',
  true,  -- ← Marca como demo
  NOW()
);
```

### Consulta de empresas reales (admin)
```sql
-- Panel de admin solo muestra empresas reales
SELECT * FROM tenants 
WHERE is_demo = false OR is_demo IS NULL
ORDER BY created_at DESC;
```

---

## 🔧 Implementación Técnica

### 1. Hook: `useIsDemoCompany()`
```typescript
// apps/app/hooks/useIsDemoCompany.ts
export function useIsDemoCompany(tenantId: string): boolean {
  const [isDemo, setIsDemo] = useState(false);
  
  useEffect(() => {
    // Query DB o context para verificar is_demo flag
    fetch(`/api/tenants/${tenantId}/info`)
      .then(res => res.json())
      .then(data => setIsDemo(data.is_demo === true));
  }, [tenantId]);
  
  return isDemo;
}
```

### 2. Endpoint: Crear Empresa Demo
```typescript
// apps/landing/app/api/auth/create-demo-tenant/route.ts
export async function POST(req: Request) {
  const { userId, email, displayName } = await req.json();
  
  const tenantId = randomUUID();
  const firstName = displayName?.split(' ')[0] || email.split('@')[0];
  
  // 1. Crear tenant demo
  await query(`
    INSERT INTO tenants (
      id, name, legal_name, tax_id, is_demo, created_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())
  `, [
    tenantId,
    `Demo SL - ${firstName}`,
    'EMPRESA DEMO SOCIEDAD LIMITADA',
    'B99999999',
    true
  ]);
  
  // 2. Crear membership
  await query(`
    INSERT INTO memberships (tenant_id, user_id, role, status)
    VALUES ($1, $2, 'owner', 'active')
  `, [tenantId, userId]);
  
  // 3. Seed datos de ejemplo
  await seedDemoData(tenantId);
  
  return { ok: true, tenantId };
}
```

### 3. Seed de Datos Demo
```typescript
async function seedDemoData(tenantId: string) {
  // Clientes
  const clientIds = await query(`
    INSERT INTO clients (tenant_id, name, tax_id, created_at)
    VALUES 
      ($1, 'Acme Corp', 'B12345678', NOW()),
      ($1, 'TechStart SL', 'B87654321', NOW()),
      ($1, 'Design Studio', 'B11111111', NOW())
    RETURNING id
  `, [tenantId]);
  
  // Facturas
  await query(`
    INSERT INTO invoices (
      tenant_id, client_id, number, date, total, status, created_at
    ) VALUES 
      ($1, $2, 'F-2026-001', '2026-01-05', 12500, 'paid', NOW()),
      ($1, $3, 'F-2026-002', '2026-01-07', 8400, 'pending', NOW()),
      ($1, $4, 'F-2026-003', '2026-01-08', 5600, 'paid', NOW())
  `, [tenantId, clientIds[0].id, clientIds[1].id, clientIds[2].id]);
  
  // Gastos
  await query(`
    INSERT INTO expenses (
      tenant_id, concept, amount, category, date, created_at
    ) VALUES 
      ($1, 'Hosting AWS', 450, 'Servicios', '2026-01-03', NOW()),
      ($1, 'Software licencias', 890, 'Tecnología', '2026-01-04', NOW()),
      ($1, 'Material oficina', 120, 'Suministros', '2026-01-06', NOW())
  `, [tenantId]);
}
```

---

## 📊 Panel de Admin - Sin Empresas Demo

### Filtro Automático
```typescript
// apps/app/app/dashboard/admin/empresas/page.tsx
async function fetchTenants() {
  const data = await adminGet<{ tenants: Tenant[] }>(
    "/api/admin/tenants?exclude_demo=true"  // ← Nuevo param
  );
  setTenants(data.tenants);
}
```

### Endpoint con Filtro
```typescript
// apps/app/app/api/admin/tenants/route.ts
export async function GET(req: Request) {
  const url = new URL(req.url);
  const excludeDemo = url.searchParams.get('exclude_demo') === 'true';
  
  let whereClause = '1=1';
  if (excludeDemo) {
    whereClause = '(is_demo = false OR is_demo IS NULL)';
  }
  
  const tenants = await query(`
    SELECT * FROM tenants
    WHERE ${whereClause}
    ORDER BY created_at DESC
  `);
  
  return NextResponse.json({ ok: true, tenants });
}
```

---

## 🎨 Mensajes según Punto de Entrada

### Landing: Botón "Solicitar Demo"
```html
<button>
  📹 Solicitar Demo Personalizada
</button>

<!-- Modal después de click -->
<h3>Queremos conocerte mejor</h3>
<p>Cuéntanos sobre tu empresa y te mostraremos 
   cómo Verifactu puede ayudarte.</p>
   
<form>
  <input name="company" placeholder="Nombre de tu empresa" />
  <input name="sector" placeholder="Sector (opcional)" />
  <button>Ver la Demo →</button>
</form>
```

### Landing: Botón "Probar Gratis"
```html
<button>
  🚀 Probar Gratis 14 Días
</button>

<!-- Modal después de click -->
<h3>Empieza tu prueba gratuita</h3>
<p>14 días de acceso completo. Sin tarjeta de crédito.</p>

<button>
  <GoogleIcon /> Continuar con Google
</button>

<p class="legal">
  Al registrarte, aceptas nuestros términos de servicio
</p>
```

### Internamente: MISMO CÓDIGO
```typescript
// Ambos botones llaman a:
async function handleSignUp() {
  await signInWithGoogle();
  await createDemoTenant(user);
  router.push('/dashboard');
}
```

---

## 🧪 Casos de Uso

### Usuario 1: Solicita Demo
```
1. Click en "Solicitar Demo"
2. Rellena nombre, email, empresa
3. Sistema: "¡Perfecto! Accede con Google para ver tu demo"
4. OAuth → Crea cuenta + Empresa Demo SL
5. Redirige a /dashboard
6. Isaak: "Hola [Nombre], he creado una empresa demo..."
```

### Usuario 2: Prueba Gratis
```
1. Click en "Probar Gratis 14 días"
2. Click en "Continuar con Google"
3. OAuth → Crea cuenta + Empresa Demo SL
4. Redirige a /dashboard
5. Isaak: "Hola [Nombre], he creado una empresa demo..."
```

### Resultado: Ambos ven lo mismo
- Dashboard con datos de Demo SL
- 14 días de trial
- Onboarding guiado por Isaak
- Posibilidad de crear empresa real después

---

## ✅ Ventajas de esta Arquitectura

1. **Un solo código**: Menos mantenimiento, menos bugs
2. **Experiencia consistente**: Todos los nuevos usuarios ven lo mismo
3. **Datos limpios**: Panel de admin sin empresas demo
4. **Flexibilidad**: Fácil cambiar mensajes de marketing sin tocar lógica
5. **Escalable**: Mismo proceso para otros flujos (afiliados, referrals)

---

## 🚧 Tareas de Implementación

### Fase 1: Base de Datos
- [ ] Añadir columna `is_demo` a tabla `tenants`
- [ ] Crear función `seed_demo_data(tenant_id)`
- [ ] Script migración para marcar empresas existentes

### Fase 2: Backend
- [ ] Endpoint `/api/auth/create-demo-tenant`
- [ ] Modificar `/api/admin/tenants` con filtro `exclude_demo`
- [ ] Hook `useIsDemoCompany(tenantId)`

### Fase 3: Frontend
- [ ] Actualizar landing: unificar botones "Demo" y "Prueba"
- [ ] Crear componente `DemoOnboarding` con Isaak
- [ ] Página `/demo` actualizada (redirige a registro)
- [ ] Panel admin: filtrar empresas demo

### Fase 4: Isaak
- [ ] Mensajes de bienvenida personalizados
- [ ] Tour guiado de 5 pasos
- [ ] Sugerencias contextuales para datos demo

---

## 📝 Notas Finales

**Decisión clave:** Demo y Trial son lo mismo.
La diferencia es solo de marketing.

**Para el usuario:**
- "Demo" suena a "ver antes de comprar"
- "Prueba" suena a "empezar a usar"

**Para nosotros:**
- Ambos son el mismo trial de 14 días
- Ambos crean Empresa Demo SL
- Ambos inician onboarding con Isaak

**Siguiente paso:** Implementar Fase 1 (DB) y Fase 2 (Backend).

---

**Creado por:** Isaak (con K)  
**Revisión:** Pendiente aprobación de Ksenia
