# Infraestructura (ubicación actual)

Para evitar romper integraciones existentes, los archivos de infraestructura siguen en la raíz del repo por ahora.

## Archivos en raíz (pendiente de migración coordinada)

- cloudbuild.yaml
- cloudbuild-backend.yaml
- run-service.yaml
- vercel.json
- docker-compose.yml
- Dockerfile
- Dockerfile.dev
- Dockerfile.prisma
- firestore.rules
- storage.rules
- policy-uptime.json

## Próximo paso

Cuando confirmes que los pipelines y despliegues ya apuntan a /infra, movemos estos archivos aquí.
