# Build Review - GeoFace Fase 1A.4 Auth Movil y Rutas Legacy

**Fecha:** 2026-07-07
**Build:** Correccion de auth movil y eliminacion de rutas legacy operativas
**Autor del build:** Agente IA (OpenCode)
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `movil/src/services/auth.ts` - `getStoredAccounts()` envia `Authorization: Bearer <token>` a `/auth/analistas`, mapea `UsuarioPublico[]` del backend a `UserAccount[]`, y `deleteAccount()` deja de llamar `/v1/users/{id}`.
- `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` - marca avances Fase 1A.4.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| mobile-reviewer | aprobado con riesgos | no | Sin bloqueantes; advierte que `deleteAccount` no propaga error si UI se reactiva y riesgo offline de `/auth/yo`. |
| security-rbac-reviewer | aprobado con riesgos | no | Sin bloqueantes; advierte HTTPS productivo, face-server legacy y logs moviles. |
| docs-tests-reviewer | aprobado con riesgos | no | Sin bloqueantes; pide evidencia 401 sin token antes de cierre productivo. |

## 3. Hallazgos bloqueantes

Ninguno vigente antes de revisores.

## 4. Hallazgos no bloqueantes

### Media - Documentacion legacy aun menciona `/v1/*`

No quedan referencias operativas `/v1/*` en codigo TS/TSX de `movil/`, pero `movil/API_CONTRACT.md` y `movil/docs/agents/*.md` siguen mencionando el contrato Flask/DeepFace legacy. Esa limpieza corresponde a Fase 1A.6.

### Media - Validacion HTTP 401 sin token pendiente

Falta validar manual o automaticamente que `/auth/analistas` y biometria protegida respondan `401` sin token en ambiente objetivo.

### Alta - HTTPS/VPN requerido antes de produccion

El JWT se envia correctamente en header, pero la base movil actual puede usar `http://` para LAN/piloto. Para produccion se requiere HTTPS/VPN o aceptacion explicita de riesgo LAN controlado.

## 5. Tests / comandos ejecutados

- `npm --prefix movil run typecheck` - PASS.
- Sanitizacion de logs moviles en `auth.ts` para evitar imprimir objetos de error crudos.
- Busqueda `/v1/` en `movil/**/*.{ts,tsx,md}` - solo quedan referencias documentales legacy, no codigo operativo TS/TSX.
- Busqueda `auth/analistas` en `movil/**/*.{ts,tsx}` - solo queda en `movil/src/services/auth.ts` con Authorization.

## 6. Documentacion actualizada

- [x] `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` actualizado con avances Fase 1A.4.
- [x] `docs/reviews/builds/2026-07-07_geoface-fase1a4-auth-rutas-legacy.md` creado.
- N/A `docs/ESQUEMA_BASE_DATOS.md` - no hubo cambios de modelos/tablas.
- N/A `testing/CATALOGO_PRUEBAS.md` - no hubo pruebas nuevas.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

El codigo operativo movil ya no llama `/v1/*`; la lista de analistas usa JWT y la creacion/eliminacion de cuentas desde movil queda bloqueada por politica empresarial. Quedan pendientes validaciones HTTP 401 y limpieza documental legacy.

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Validar endpoints protegidos sin token responden `401`. | Backend/QA | 2026-07-08 |
| Actualizar `movil/API_CONTRACT.md` y docs legacy en Fase 1A.6. | Mobile/Docs | 2026-07-08 |
| Continuar Fase 1A.5: app movil lista para build. | Mobile | 2026-07-08 |
