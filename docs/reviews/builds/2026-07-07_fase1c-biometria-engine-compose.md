# Fase 1C - Biometria Engine en Compose Productivo

Fecha: 2026-07-07

## Alcance

Correccion del bloqueo critico de infraestructura: `biometria-engine` no estaba declarado en `docker-compose.prod.yml` ni en `docker-compose.Pruebas3.yml`.

## Cambios aplicados

- Se agrego `biometria-engine` a `docker-compose.prod.yml`.
- Se agrego `biometria-engine` a `docker-compose.Pruebas3.yml`.
- El engine queda sin `ports`; solo usa `expose: 8010`.
- El engine queda aislado en red interna Docker (`internal: true`).
- El backend se conecta a la red publica de la app y a la red interna del engine.
- El backend usa `BIOMETRIA_ENGINE_URL=http://biometria-engine:8010`.
- `BIOMETRIA_ENGINE_TOKEN` queda obligatorio en prod/Pruebas3 mediante interpolacion requerida de Docker Compose.
- El backend espera `biometria-engine` con `condition: service_healthy`.
- Los pesos DeepFace quedan persistidos en volumen propio del engine.
- Las evidencias biometricas del backend quedan persistidas en bind mounts separados:
  - `/app/storage/perfiles`
  - `/app/storage/asistencias`

## Validacion

- `docker compose --env-file .env -f docker-compose.prod.yml config --quiet`: passed con `BIOMETRIA_ENGINE_TOKEN` temporal de validacion.
- `docker compose --env-file .env.pruebas3 -f docker-compose.Pruebas3.yml config --quiet`: passed con `BIOMETRIA_ENGINE_TOKEN` temporal de validacion.
- `python -m pytest testing/backend/test_biometria_engine_client.py testing/backend/test_biometria_service.py testing/backend/test_biometria_router_engine.py -q`: 20 passed.

## Riesgos pendientes

- Falta definir `BIOMETRIA_ENGINE_TOKEN` real en los ambientes no locales antes de desplegar.
- Falta ejecutar build/healthcheck real contra Docker en ambiente objetivo.
- Falta confirmar backup y politicas de retencion para `storage/perfiles` y `storage/asistencias`.
- Si el despliegue usa `.env.pruebas3`, ejecutar Docker Compose con `--env-file .env.pruebas3` o exportar `BIOMETRIA_ENGINE_TOKEN` en el entorno antes de resolver el compose.
- Produccion abierta sigue bloqueada por politica HTTPS/VPN y `usesCleartextTraffic` movil.
