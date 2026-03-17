# Alias de correo (guia de uso)

Esta guia explica como usamos los alias de correo de Verifactu Business para dar mejor presentacion al usuario y centralizar la gestion en soporte@verifactu.business.

## Principio base
Todos los alias **reciben** y **se enrutan** a `soporte@verifactu.business`. Isaak tiene acceso a ese buzon y puede responder automaticamente o escalar a un humano segun el flujo configurado.

## Alias y uso recomendado
- `info@verifactu.business`
  Entrada principal para consultas generales, demos y presupuestos.
- `hola@verifactu.business`
  Alias secundario para contacto rapido (landing).
- `notificaciones@verifactu.business`
  Correos transaccionales (verificacion, restablecer contrasena, alertas del sistema).
- `facturacion@verifactu.business`
  Cobros, facturas y temas administrativos de pago.
- `admin@verifactu.business`
  Comunicaciones internas y permisos especiales.
- `soporte@verifactu.business`
  Soporte tecnico y centro de operaciones.

## Reglas de envio (presentacion)
Para mejorar la presentacion de cara al usuario:
- Emails transaccionales **salen** desde `notificaciones@verifactu.business`.
- Contacto comercial y presupuesto **salen** desde `info@verifactu.business`.
- Soporte tecnico **sale** desde `soporte@verifactu.business`.

## Resumen rapido
- Cara al usuario: `info@`, `notificaciones@` (hola@ como secundario).
- Gestion interna: todo entra en `soporte@` y se responde desde el alias adecuado.

## Configuracion recomendada (Resend / proveedor SMTP)
1) Verificar dominio `verifactu.business`.
2) Crear rutas/alias para reenviar todo a `soporte@verifactu.business`.
3) Configurar variables de entorno:
   - `RESEND_FROM_SUPPORT=Verifactu Business <soporte@verifactu.business>`
   - `RESEND_FROM_INFO=Verifactu Business <info@verifactu.business>`
   - `RESEND_FROM_NOREPLY=Verifactu Business <notificaciones@verifactu.business>`
4) Revisar que `soporte@` pueda recibir y que Isaak tenga acceso.

## Flujos con Isaak
- Entrada: todos los correos llegan a `soporte@`.
- Clasificacion automatica: Isaak etiqueta (soporte, ventas, facturacion, notificaciones).
- Respuesta: automatica si procede; si no, se asigna a un agente.
