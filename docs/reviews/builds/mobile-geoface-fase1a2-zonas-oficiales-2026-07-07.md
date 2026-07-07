# Mobile review — GeoFace Fase 1A.2 Zonas Oficiales

**Fecha:** 2026-07-07  
**Build:** GeoFace Fase 1A.2 — zonas oficiales desde backend  
**Revisor:** mobile-reviewer  
**Modo:** build  
**Proyecto:** Gestor-de-proyectos-Ti

---

## Decisión

**approved_with_risks**

La integración móvil apunta correctamente a zonas oficiales: consume `GET /biometria/zonas`, crea/elimina por backend y mapea `id/nombre/latitud/longitud/radio` a `Zone`. No detecté loop infinito en `AuthGate`; el guard por usuario evita reconsultas de zonas. Quedan riesgos operativos relevantes para check-in con `zona_id` real y UX offline/sin zonas.

## Hallazgos por severidad

### High — `nearestZone.id` no queda garantizado como ID oficial bajo caché legacy o refresh fallido

- `AppContext.refreshZones()` reemplaza caché solo si `getOfficialZones()` responde; si falla, conserva `zones` locales (`movil/src/context/AppContext.tsx:116-132`).
- `VerifyScreen` envía `nearestZone?.id || '0'` como `zona_id` (`movil/src/screens/VerifyScreen.tsx:117-123`).
- En instalaciones existentes con zonas locales pre-Fase 1A.2 o si el refresh de zonas falla, el operador puede quedar “En Zona” por caché local y enviar un ID no oficial. Eso rompe el objetivo de trazabilidad de Fase 1A.2; además el backend actual puede resolver zona inválida como `None` y registrar asistencia sin zona real.

**Recomendación:** marcar caché de zonas como “oficial sincronizada”/versión, bloquear verificación o mostrar “requiere sincronizar zonas oficiales” cuando la app no haya sincronizado exitosamente al menos una vez, y limpiar/migrar IDs legacy.

### Medium — UX insuficiente cuando no hay zonas oficiales o el usuario no es admin

- Dashboard muestra “Crea una zona en Ajustes” cuando `nearestZone` es null (`DashboardScreen.tsx:195-200`), pero usuarios no admin no pueden crear zonas en Settings.
- Verify muestra “Debes estar físicamente dentro de una zona…” aun si no existe ninguna zona cargada (`VerifyScreen.tsx:218-239`).

**Recomendación:** diferenciar “sin zonas oficiales configuradas/sin sincronizar” de “fuera de zona”; para operadores, indicar contactar a un administrador y ofrecer reintento de sincronización.

### Medium — Settings admin puede duplicar solicitudes y dificulta coordenadas reales en móvil

- El modal de zona no tiene estado `isSaving`; doble tap en “Agregar” puede crear zonas duplicadas mientras espera backend (`SettingsScreen.tsx:170-190`, `609-614`).
- `keyboardType="numeric"` para lat/lng puede dificultar decimales/negativos en iOS/Android, justo para longitudes negativas (`SettingsScreen.tsx:561-580`).

**Recomendación:** deshabilitar botón durante submit, mostrar loader/error específico de backend y usar entrada compatible con decimal/signo o validar/normalizar con controles dedicados.

### Low — `refreshZones` cambia identidad por depender de `zones`

- `refreshZones` depende de `zones` solo para devolver fallback (`AppContext.tsx:116-132`), lo que hace que `AuthGate` reevalúe el efecto tras cada cambio de zonas (`_layout.tsx:23-44`).
- No observé loop infinito porque `zonesCheckUserId` corta nuevas llamadas, pero aumenta churn y complejidad.

**Recomendación:** estabilizar `refreshZones` con `useRef`/estado funcional o devolver `[]`/último valor controlado sin depender de `zones`.

## Required checks

- `npm --prefix movil run typecheck` — PASS reportado por el build; no lo rerunée.
- `npm run lint` / `npm run test` — no existen en `movil/package.json`; si se agregan para RN/Expo, deben quedar obligatorios.
- Validación manual requerida en Android físico: admin crea zona oficial, operador sincroniza, entra en radio, realiza check-in y se confirma `zona_id` real en `/biometria/asistencias`.
- AGENTS.md no declara versión Node explícita; no hay `engines.node` en `movil/package.json`.

## Offline/performance risks

- Offline/cache: útil para mostrar geocerca, pero hoy no distingue caché oficial vigente vs. legacy/stale; riesgo de auditoría en check-in.
- Performance: sin regresión relevante para listas/media en este cambio; Settings usa lista simple de zonas esperablemente pequeña. No hay virtualización, aceptable salvo catálogos grandes de zonas.
- Native/permissions: no cambia permisos; flujo sigue dependiendo de GPS/cámara. Falta UX específica para “zonas no sincronizadas” aunque permisos estén OK.

## Blocking reasons

Ninguno bloqueante para compilar, pero el hallazgo High debe cerrarse antes de considerar Fase 1A.2 lista para producción auditada.
