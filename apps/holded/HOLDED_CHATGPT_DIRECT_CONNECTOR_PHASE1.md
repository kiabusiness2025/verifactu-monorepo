# Holded Direct Connector - Publicacion limpia Fase I

Esta guia es la version canonica para publicar el conector MCP de ChatGPT en Fase I.

Objetivo: flujo minimo y estable.

- OAuth
- API key de Holded
- retorno a ChatGPT

Todo lo que no sea necesario para ese recorrido queda fuera de esta guia.

## 1) Configuracion OAuth recomendada (pantalla de ChatGPT)

### Registro de cliente

- Metodo de registro: Cliente OAuth definido por el usuario
- URL de retorno: https://chatgpt.com/connector/oauth/CKsc4g2DDcon
- OAuth Client ID: openai-chatgpt-15a62f06d3bb783eb65a7a85
- OAuth Client Secret: dejar vacio
- Metodo de autenticacion del token endpoint: none

### Endpoints OAuth

- URL de autenticacion: https://holded.verifactu.business/oauth/authorize
- Token URL: https://holded.verifactu.business/oauth/token
- URL de registro: https://holded.verifactu.business/oauth/register
- Base del servidor de autorizacion: https://holded.verifactu.business
- Recurso: https://holded.verifactu.business/api/mcp/holded

### OIDC

- OIDC habilitado: si
- URL de configuracion OIDC: https://holded.verifactu.business/.well-known/openid-configuration
- Userinfo OIDC: https://app.verifactu.business/oauth/userinfo

## 2) Scopes para publicar ya (recomendado)

Usar estos scopes predeterminados:

- mcp.read
- holded.invoices.read
- holded.invoices.write
- holded.contacts.read
- holded.accounts.read
- holded.crm.read
- holded.projects.read

Nota:

- holded.accounts.write solo añadir si es imprescindible en esta iteracion.

## 3) Checklist de pre-publicacion

1. Client ID exactamente igual al de arriba.
2. Client secret vacio.
3. Token endpoint auth method en none.
4. Authorization URL y Token URL en dominio holded.verifactu.business.
5. OIDC habilitado con userinfo en app.verifactu.business/oauth/userinfo.
6. Borrar borrador anterior del conector si tuvo errores de configuracion.
7. Crear conector nuevo desde cero y publicar.

## 4) Fuera de alcance en esta Fase I

No mezclar en esta publicacion:

- onboarding largo por pasos de perfil completo
- handoff a dashboard como requisito
- contenido de producto no necesario para completar OAuth + API key
- contenido historico/legacy de flujos antiguos

## 5) Referencias tecnicas

- Endpoint MCP publico: https://holded.verifactu.business/api/mcp/holded
- Metadata OAuth AS: https://holded.verifactu.business/.well-known/oauth-authorization-server
- Metadata OIDC: https://holded.verifactu.business/.well-known/openid-configuration
