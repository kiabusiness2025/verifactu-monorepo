# Roadmap de Ampliación del Conector Holded (2026)

Este documento centraliza la hoja de ruta para la ampliación del conector Holded, alineando prioridades de negocio con los scopes confirmados en la API pública y evitando duplicidad con la documentación técnica existente.

## Índice de documentación relevante

- [Matriz de capacidades beta](HOLDED_DIRECT_CONNECTOR_BETA_CAPABILITY_MATRIX_2026-04-10.md)
- [Plan de implementación Fase 1](HOLDED_DIRECT_CONNECTOR_PHASE1_IMPLEMENTATION_PLAN_2026.md)
- [Contrato público Fase 1](HOLDED_DIRECT_CONNECTOR_PHASE1_CONTRACT_2026.md)
- [Release notes](HOLDED_DIRECT_CONNECTOR_RELEASE_NOTES_2026-04-10.md)

---

## Ampliaciones por bloques y prioridades (2026)

La ampliación del conector Holded se realizará en bloques, siguiendo el orden de prioridades para maximizar el impacto en negocio y demo real.

### Bloque 1 (Prioridad máxima)

1. Compras / gastos / purchase documents
2. Contactos CRUD
3. Empleados
4. Pagos
5. Servicios

### Bloque 2

6. Productos
7. Proyectos create/update
8. Tareas create/update
9. Bookings create/update
10. Time tracking

### Bloque 3

11. Cuentas contables completas
12. Asientos de diario completos
13. Taxes
14. Expenses accounts

---

### Notas importantes

- El scope actual de cuentas parece devolver una vista parcial del plan contable y hay que revisarlo.
- Nóminas y activos no se consideran confirmados en API pública hasta validación adicional.
- La prioridad máxima para negocio y demo real es compras + contactos CRUD + empleados + pagos + servicios.

---

**Para detalles de implementación y casos demo, consulta:**

- [Plan de implementación por bloques](HOLDED_DIRECT_CONNECTOR_EXPANSION_IMPLEMENTATION_PLAN_2026.md)

**Este roadmap debe revisarse y actualizarse conforme avance la implementación y se validen nuevos endpoints públicos en la API de Holded.**
