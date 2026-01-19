# Smoke Tests (rápidos)

Checklist corto para validar que los flujos críticos siguen funcionando tras cambios.

## 1) Acceso y sesión
- Abrir `https://verifactu.business/auth/login`.
- Iniciar sesión (Google o Microsoft).
- Confirmar redirect a `https://app.verifactu.business/dashboard`.
- Verificar que no aparece 401/403 en consola.

## 2) Dashboard básico
- Saludo aparece solo en la tarjeta (no en topbar).
- Se carga el panel sin 404.

## 3) Empresas
- Si no hay empresas: aparece **Empresa Demo SL** y modo demo.
- Crear empresa desde “+”:
  - Autocomplete eInforma devuelve sugerencias.
  - Seleccionar empresa rellena nombre/NIF.
  - Guardar crea empresa y cambia el tenant activo.

## 4) eInforma
- Buscar por nombre/NIF con 3+ caracteres.
- Si falta configuración, debe mostrarse error claro y permitir crear manualmente.

## 5) Admin > Emails
- Tabs: Bandeja / Enviar / Configuración muestran textos con tildes correctas.
- Inserción de email de prueba funciona.
- Enviar correo real (si Resend está configurado).

## 6) Logout
- “Cerrar sesión” limpia cookie y vuelve a landing.

## 7) Verificación de dominio (Microsoft)
- Abrir `https://verifactu.business/.well-known/microsoft-identity-association` y confirmar JSON válido.
