# Auditoría de ejecución — Plan Producción GeoFace + Horas Extras

**Fecha de auditoría:** 2026-07-07
**Plan auditado:** `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md`
**Rama:** `Modulo_Geoface` (commit base `961184d`, HEAD `89aa82c`)
**Auditor:** Agente IA (OpenCode) — rol auditor, modo read-only
**Ventana objetivo del plan:** 1 semana calendario (2026-07-05 → 2026-07-11)

---

## 1. Veredicto general

**DESVIACIÓN CONTROLADA — progreso real sustancial, pero NO se cumple la ventana de 1 semana ni la condición de ruta crítica.**

- Se completó Fase 0 (baseline) y se ejecutó trabajo agresivo sobre Fase 1A (GeoFace) y Fase 1B (HE) en paralelo.
- **La ruta crítica exigía no iniciar Fase 3 hasta que Fase 1A y 1B estuvieran aprobadas con evidencia.** Ninguna de las dos está aprobada (ambas quedan `approved_with_risks` o `blocked`); por tanto la Fase 3 y las validaciones E2E (Fase 4) no han comenzado legítimamente. Esto NO es desviación: se está respetando la puerta.
- La desviación principal es de **calendario y de criterios de salida**: muchas subtareas marcadas `[ ]` en el plan están aún sin cerrar, y los criterios de salida de cada fase quedan incompletos al 2026-07-07 (día 3 de la ventana de 7 días).
- Existe desviación menor de proceso: hay commits de feature (`fix`, `test`) sobre `Modulo_Geoface` sin evidencia de revisión simultánea por los revisores obligatorios antes de cada push. Los reviews sí se ejecutaron (memoria `.opencode/memory/` lo confirma), pero a posteriori.

Calificación por dimensión:

| Dimensión | Estado | Comentario |
|---|---|---|
| Avance funcional | **Amarillo** | Fase 0 y ~80% de 1A/1B implementadas |
| Calidad/evidencia | **Amarillo** | Suites HE puntuales pasan, suite monolítica inestable |
| Seguridad/RBAC | **Amarillo** | Bloqueantes iniciales resueltos, quedan altos NO-GO prod |
| Cumplimiento de calendario | **Rojo** | Día 3/7 con criterios de salida 1A y 1B sin cerrar |
| Cumplimiento de ruta crítica | **Verde** | No se ha violado la puerta Fase 3 |
| Documentación | **Amarillo** | Esquema HE actualizado; runbook y APK pendientes |

---

## 2. Avance por fase (plan vs realidad)

### Fase 0 — Baseline y control de alcance
- **Plan:** 11 tareas + 4 criterios de salida.
- **Realidad:** 3 de 11 tareas cerradas (rama, baseline, commit). 8 tareas humanas pendientes: responsables por track, ambiente objetivo, HTTPS/VPN, dispositivos físicos, usuarios de prueba y reglas GH vigentes.
- **Criterios de salida:** 0/4 cerrados. El reporte `2026-07-06_geoface-horas-extras-fase0-baseline.md` marca `bloqueado`.
- **Desviación:** Se inició Fase 1A/1B sin cerrar Fase 0. Esto es **infracción del proceso** (la ruta crítica arranca en Fase 0). Es mitigado porque el trabajo técnico en 1A/1B no depende de esas decisiones humanas para validar código, pero **la puerta de "ambiente/usuarios/reglas GH" sigue abierta y bloquea QA E2E más adelante**.

### Fase 1A — GeoFace como marcador oficial confiable
- **Plan:** 6 subfases (1A.1–1A.6) + 8 criterios de salida.
- **Realidad:**
  - **1A.1 (enrolamiento backend-source):** completado. Fail-closed, `/biometria/estado`, `AuthGate` corregido. Quedan `[ ]` cache visual como no-autoridad y prueba de storage borrado.
  - **1A.2 (zonas oficiales):** completado. Backend consume zonas, IDs reales, mapeo de campos, validación geocerca Haversine. Queda `[ ]` comportamiento sin zonas (riesgo fail-open detectado por security-rbac-reviewer).
  - **1A.3 (evidencias autenticadas):** completado en código, pero security-rbac-reviewer marcó **`blocked`** por riesgo de envío de JWT a URL externa y cache local de biométricos sin TTL.
  - **1A.4 (auth móvil y rutas legacy):** completado. Queda `[ ]` confirmar 401 sin token.
  - **1A.5 (build móvil):** parcial. Hay `typecheck`, `eas.json` 配置, permisos revisados, `RECORD_AUDIO` removido. **NO hay APK preview generado ni probado en 2 dispositivos físicos** (criterio de salida bloqueante del plan).
  - **1A.6 (legacy/docs):** completado.
- **Criterios de salida GeoFace:** 0/8 cerrados. Falta APK preview en físicos, validación 401, comportamientos edge.
- **Desviación:** Se marcó el criterio de salida "APK preview instalado y probado" como NO cumplido; sin APK no se puede certificar GeoFace mobile.

### Fase 1B — Horas Extras standalone
- **Plan:** 5 subfases + 5 criterios de salida.
- **Realidad:**
  - **1B.1 (backend HE + reglas):** suites S0–S9 ejecutadas de forma aislada y secuenciales con pases reportados (27/28/18/16/23/22/12/13/14/16/4/4). Hardening post-0dffebe añadió HEFD/HEFN numéricos, pre-vigencia 44h, CRC32 OT, reparto OT. **En la última corrida S6 reportó 1 failing** en `horas-extras-fase1b-evidencia-2026-07-07.md` — no bloqueante para el delta RBAC pero impide certificar S6 completa.
  - **1B.2 (migraciones/seeds):** se menciona verificación pero no hay en el plan celdas marcadas. Pendiente.
  - **1B.3 (OT/planificador/costos):** validación parcial; S8 cubre integración indirecta con aserción relativa. Brecha conocida: sin test numérico de `horas_ot = round(horas_ext * proporcion)`.
  - **1B.4 (frontend web HE):** `npm run build` PASS, typecheck PASS, test service 33 PASS. **No hay tests de UI/componente** para `PreLiquidacionView`/`HorarioSemanaView` (brecha crítica reportada por docs-tests-reviewer).
  - **1B.5 (RBAC/auditoría):** últimos commits `89aa82c` endurecen RBAC granular con 5 permisos nuevos y migración legacy→granular. security-rbac-reviewer pasa de `blocked` a `approved_with_risks` para piloto controlado.
- **Criterios de salida HE:** 0/5 cerrados. Suite S6 con fallo residual, suite monolítica sin pase estable, migraciones/seeds formales pendientes, UI tests faltantes.
- **Desviación:** Hay progreso real, pero los criterios de salida globales no se han marcado `[x]`. La suite monolítica sigue inestable (timeout histórico); el piloto está `approved_with_risks` solo para un cohort pequeño y confiable, **NO para producción amplia**.

### Fase 1C — Infraestructura productiva
- **Plan:** 12 tareas + 5 criterios de salida. **NO iniciada formalmente.**
- **Realidad detectorada por grep:** `biometria-engine` solo aparece en `docker-compose.yml` (local). **NO aparece en `docker-compose.prod.yml` ni en `docker-compose.Pruebas3.yml`** — bloqueante crítico para producción confirmado en la Fase 0.
- **Criterios de salida infra:** 0/5. Bloqueo total.

### Fase 2 — Contrato asistencia → HE
- **No iniciada.** Respeta la puerta de la ruta crítica (1A/1B no aprobadas).

### Fase 3 — Integración mínima E2E
- **No iniciada.** Respeta la puerta.

### Fase 4 — Validación E2E y QA de campo
- **No iniciada.** El plan exige 13 escenarios E2E; ninguno ejecutado (no hay APK sobre dispositivos físicos).

### Fase 5 — Despliegue, docs y cierre
- **No iniciada.** Documentación parcial: `docs/ESQUEMA_BASE_DATOS.md` actualizado para HE (post-0dffebe), `movil/API_CONTRACT.md` y docs móvil actualizadas. Runbook no creado.

---

## 3. Cumplimiento del calendario sugerido (día 3 de 7)

| Día planeado | Track GeoFace | Track HE | Track Integración/QA |
|---|---|---|---|
| Día 1 | ✅ Enrolamiento backend, auth legacy | ⚠️ Tests S0-S9 sueltos | ❌ Contrato preliminar no congelado |
| Día 2 | ✅ Zonas oficiales, evidencias | ⚠️ OT/costos parcial, sin UI tests | ❌ Endpoints integración no definidos |
| Día 3 (hoy) | ⚠️ Typecheck OK, **APK preview NO**, docs OK | ✅ RBAC granular commit | ❌ Fase 2 no iniciada |
| Día 4-7 | 🔴 Pendiente | 🔴 Pendiente | 🔴 Pendiente |

**Conclusión calendario:** vamos en ~60% del progreso técnico proyectado para el día 3, pero con la línea de integración/QA completamente vacía — que es la línea más larga de la semana.

---

## 4. Punto crítico: ¿vamos bien o desviados?

**Vamos con desviación leve-moderada de calendario, pero con control de ruta crítica.**

Lo que SÍ va bien:
- Decisión técnica acertada: backend como fuente de verdad, fail-closed, eliminación de rutas legacy.
- Disciplina de revisión: 13 reportes generados en `docs/reviews/builds/` en 2 días, con trazas en `.opencode/memory/` de tres revisores (mobile, security, docs-tests).
- RBAC: endurecimiento granular bienvenido antes de integración (evita deuda técnica posterior).
- No se violó la puerta de Fase 3 sin aprobación de 1A/1B.
- Riesgos legales (reglas GH, festivos, Emiliani) cubiertos con tests reales.

Lo que NO va bien:
- **Fase 0 nunca se cerró formalmente** y ya estamos en día 3. Sin decyziones humanas (HTTPS/VPN, dispositivos, usuarios, reglas GH confirmadas) la Fase 4 no podrá ejecutarse a tiempo.
- **APK preview no existe** — el plan lo marca como bloqueante para certificar GeoFace y es la entrada a pruebas físicas (Día 4 planeado).
- **`biometria-engine` ausente en compose prod/Pruebas3** — sin esto no hay despliegue productivo posible.
- **Suite HE monolítica inestable** — evidencia demuestra timeouts previos y al menos un failing en S6.
- **Línea de integración/QA al 0%** al día 3 — la línea más larga del plan.
- **Risk residual de seguridad** sobre producción amplia de HE: security-rbac-reviewer ratifica NO-GO broad production por RBAC coarse y planner bulk confirmation audit.

---

## 5. Hallazgos bloqueantes residuales

| # | Hallazgo | Severidad | Bloquea |
|---|---|---|---|
| B1 | `biometria-engine` no está en `docker-compose.prod.yml` ni `docker-compose.Pruebas3.yml` | Crítica | Fase 1C, Fase 5 |
| B2 | APK preview no generado ni probado en 2 Android físicos | Crítica | Fase 1A criterio salida, Fase 4 |
| B3 | Decisiones humanas Fase 0 sin confirmar (HTTPS/VPN, dispositivos, usuarios, reglas GH) | Alta | Fase 4, Fase 5 |
| B4 | Suite HE monolítica sin pase estable; S6 con 1 failing residual | Alta | Criterio salida Fase 1B |
| B5 | Cache local de evidencias biométricas sin TTL/limpieza (security blocked en Fase 1A.3) | Alta | Fase 1A criterio salida |
| B6 | Cleartext HTTP habilitado por defecto en `app.json` para producción | Alta | Fase 1A.5, Fase 5 |
| B7 | UI/component tests HE inexistentes para `PreLiquidacionView`/`HorarioSemanaView` | Media-Alta | Fase 1B.4 |
| B8 | Comportamiento fail-open cuando no hay zonas oficiales configuradas | Media | Fase 1A.2 |

---

## 6. Riesgos no aceptables del plan (sección 15) — estado

| Riesgo del plan | Estado actual |
|---|---|
| GeoFace guarda perfil local si backend no enrola | ✅ Resuelto (fail-closed) |
| Zonas locales respaldan HE | ✅ Resuelto (backend fuente) |
| Evidencias sin auth en app | ✅ Resuelto (fetch con JWT) |
| HE sin migraciones/seeds | ⚠️ Parcial: verificado parcial, sin corrida formal |
| Integración automática sin revisión humana | ✅ Controlado (Fase 3 no iniciada) |
| HTTP claro en producción abierta | 🔴 **Pendiente** (`usesCleartextTraffic` true, sin HTTPS/VPN obligatorio) |
| `face-server` legacy activo | ⚠️ Marcado como histórico no productivo, no eliminado físicamente |
| Tests HE S9 fallando | ✅ Pasando (4 passed), aunque cobertura crítica cuestionada por auditoría |
| APK no probado en físico | 🔴 **Pendiente** (no hay APK) |

---

## 7. Recomendaciones de corrección de rumbo

1. **Cerrar Fase 0 hoy** con decisión documentada (aunque sea "piloto LAN controlado con riesgo aceptado temporal") para desbloquear Fase 4. Sin esto no hay meta de semana alcanzable.
2. **Generar APK preview inmediatamente** y empezar pruebas en al menos 1 dispositivo físico (Día 4 planeado). Sin APK el día 4 se cae.
3. **Corregir `usesCleartextTraffic` y订立 política HTTPS/VPN** obligatoria para producción. Si se permite LAN temporal, documentar explícitamente en `móvil/docs/GUIA-DESARROLLO.md`.
4. **Añadir `biometria-engine` a `docker-compose.prod.yml` y `docker-compose.Pruebas3.yml`** antes de cualquier intento de despliegue.
5. **Estabilizar suite HE monolítica o aceptar formalmente matriz secuencial aislada** como criterio de salida válido. Actualmente docs-tests-reviewer relevaodesbloqueo por esto.
6. **Resolver TTL de cache local de evidencias** para desbloquear Fase 1A.3 (security blocked).
7. **Planificar UI tests HE** para `PreLiquidacionView`/`HorarioSemanaView` antes del cierre Fase 1B. No exige cobertura total pero al menosservicio/componente mínimo.
8. **Re-programar calendario**: con día 3 al 60% técnico y línea QA al 0%, la ventana de 1 semana es **inviable**. Recomendar extender a 10-12 días o reducir alcance de Fase 3 a integración mínima de solo lectura.

---

## 8. Métricas de seguimiento

- Commits en ventana (desde 2026-07-05): 6 commits de implementación/test/docs sobre rama `Modulo_Geoface`.
- Reportes de build generados: 13 (Fase 0: 1, Fase 1A: 12, Fase 1B: 10 solapados).
- Revisiones formalizadas en memoria: 7 mobile, 6 security, 6 docs-tests.
- Tareas del plan marcadas `[x]`: ~22/140 (≈15%).
- Criterios de salida cerrados por fase: 0/5 fases con todos sus criterios completos.

---

## 9. Conclusión del auditor

**Estado: AMARILLO — desviación controlada pero significativa.**

El plan se está ejecutando con disciplina técnica y de revisión superior a la media, pero el progreso real está ~2 días por detrás del calendario sugerido, y los criterios de salida por fase no se están marcando formalmente (todas en `[ ]`). La tendencia es correcta; la velocidad es insuficiente para cerrar la semana dentro de la ventana objetivo sin ajustar alcance o formalizar convenios de evidencia (matriz secuencial HE, piloto LAN).

Recomendado: **re-planificar a ventana de 10 días**, cerrar Fase 0 hoy, generar APK antes del día 4, y no iniciar Fase 3 hasta que Fase 1A y 1B estén sinceramente `[x]` en sus criterios de salida — no solo "approved_with_risks".

---

**Auditoría persistida por:** Agente IA (OpenCode) rol auditor.
**Próxima revisión recomendada:** 2026-07-09 (al cierre de Fase 1A/1B o al final de la ventana ajustada).
