# Sprint S6 — Bolsa de horas desactivable

## Estado
- **Fase**: IMPLEMENT (en curso)
- **Autor**: Agente IA (sesión con el usuario)
- **Fecha**: 2026-06-17
- **Origen del requisito**: el analista de nómina reporta que en su operación habitual el extra se paga directamente en nómina, sin acumularse en bolsa para tiempo compensatorio. Hoy el sistema siempre acredita.

---

## 1. Objetivo y reglas de negocio

### 1.1 Objetivo

Permitir desactivar la bolsa de horas de manera controlada, replicando el patrón `default + override` ya usado en `resolver_autorizacion_he`. Decisiones validadas con el usuario:

- **Granularidad**: doble nivel — flag global + override por OT.
- **COMPENSADO con bolsa desactivada**: bloqueado con HTTP 409 `BOLSA_DESACTIVADA`.
- **PAGADO y ANULADO**: siguen funcionando independientemente.
- **Default inicial**: bolsa activa (preserva comportamiento histórico).
- **Compensación manual `POST /bolsa/compensar`**: sin cambios — sigue dependiendo de bolsa preexistente.

### 1.2 Matriz de comportamiento

| Estado global | Override OT | Resultado | COMPENSADO | PAGADO | ANULADO |
|---|---|---|---|---|---|
| True (default) | N/A | Acredita bolsa | OK | OK | OK |
| False | N/A | No acredita | 409 | OK | OK (no-op reversión) |
| True | False | No acredita | 409 | OK | OK (no-op reversión) |
| False | True | Acredita | OK | OK | OK |

---

## 2. Modelo de datos

### 2.1 Nueva tabla: `nomina_bolsa_ot_override`

Bitácora inmutable de overrides por OT del flag global. Replica la forma de `nomina_override_autoriza_he`.

```sql
CREATE TABLE nomina_bolsa_ot_override (
    id SERIAL PRIMARY KEY,
    ot_id INTEGER NOT NULL,
    bolsa_habilitada_override BOOLEAN NOT NULL,
    bolsa_habilitada_erp BOOLEAN NOT NULL,        -- snapshot del global al crear el override
    motivo VARCHAR(500) NOT NULL,
    autorizado_por VARCHAR(100) NOT NULL,
    autorizado_por_id VARCHAR(50),
    vigente_desde TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    vigente_hasta TIMESTAMPTZ,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',  -- 'ACTIVO' | 'REVOCADO' | 'EXPIRADO'
    documento_soporte_url VARCHAR(500),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bolsa_ot_override_ot ON nomina_bolsa_ot_override (ot_id);
CREATE INDEX idx_bolsa_ot_override_estado ON nomina_bolsa_ot_override (estado);
CREATE INDEX idx_bolsa_ot_override_activa ON nomina_bolsa_ot_override (ot_id) WHERE estado = 'ACTIVO';
```

### 2.2 Parámetro legal global (existente, nueva fila seed)

`nomina_parametros_legales` con `codigo = 'BOLSA_GLOBAL_HABILITADA'`, `tipo_dato = 'BOOLEANO'`, valor inicial `'true'`. La rotación de vigencia se hace cerrando la fila previa con `vigente_hasta = hoy` y creando nueva con `vigente_hasta = null`.

---

## 3. Resolver (`backend/app/services/novedades_nomina/bolsa_horas_resolver.py`)

```python
async def resolver_bolsa_habilitada(session, ot_id) -> Tuple[bool, str]:
    # 1. Override por OT vigente (estado=ACTIVO, vigente_hasta nulo o futuro)
    # 2. Parametro legal global vigente (codigo=BOLSA_GLOBAL_HABILITADA)
    # 3. Default seguro True
```

Fuentes: `'OVERRIDE_OT' | 'PARAMETRO_LEGAL' | 'DEFAULT'`.

---

## 4. Endpoints

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/api/v2/novedades-nomina/horas-extras/bolsa/estado-global?ot_id=` | `nomina_horas_extras` | Devuelve `{bolsa_habilitada, fuente}`. |
| POST | `/api/v2/novedades-nomina/horas-extras/bolsa/overrides-ot` | `nomina_horas_extras` | Crea override activo (revoca los previos de la OT). Body: `{ot_id, bolsa_habilitada_override, motivo, autorizado_por}`. |
| DELETE | `/api/v2/novedades-nomina/horas-extras/bolsa/overrides-ot/{id}` | `nomina_horas_extras` | Marca `estado=REVOCADO`, `vigente_hasta=now()`. |
| PUT | `/api/v2/novedades-nomina/horas-extras/admin/bolsa/global` | `nomina_horas_extras` | Crea nueva vigencia del parámetro legal. Body: `{habilitada, justificacion, autorizado_por}`. |

Modificaciones:
- `POST /pre-liquidacion/confirmar` — respuesta añade `bolsa_habilitada_en_confirmacion` y `bolsa_fuente`.
- `POST /calculos/{id}/transicion` con destino `COMPENSADO` — devuelve HTTP 409 con `{code: "BOLSA_DESACTIVADA", message: ...}` si la bolsa está desactivada.

---

## 5. Casos de prueba (S6 backend)

| # | Caso | Esperado |
|---|---|---|
| 1 | resolver sin datos | `(True, 'DEFAULT')` |
| 2 | resolver global True sin override | `(True, 'PARAMETRO_LEGAL')` |
| 3 | resolver global False sin override | `(False, 'PARAMETRO_LEGAL')` |
| 4 | resolver override False sobre global True | `(False, 'OVERRIDE_OT')` |
| 5 | resolver override REVOCADO | `(True, 'PARAMETRO_LEGAL')` |
| 6 | confirmar con global False | no acredita, costo_ot sí |
| 7 | confirmar con override OT False | no acredita, fuente `OVERRIDE_OT` |
| 8 | confirmar con override OT True sobre global False | acredita, fuente `OVERRIDE_OT` |
| 9 | COMPENSADO con bolsa desactivada | `ValueError("BOLSA_DESACTIVADA:...")` |
| 10 | PAGADO con bolsa desactivada | OK |
| 11 | ANULADO con bolsa desactivada | OK, sin REVERSION_ACREDITACION |
| 12 | compensar manual sin bolsa + global off | `ValueError("no tiene bolsa")` |
| 13 | compensar manual con bolsa legacy + global off | OK |

---

## 6. Frontend

- `obtenerEstadoGlobalBolsa(otId, token)` — consulta el resolver.
- `configurarBolsaGlobal(payload, token)` — admin.
- `crearOverrideBolsaOT(payload, token)` — override OT.
- `revocarOverrideBolsaOT(overrideId, token)` — revocar.

Vistas:
- `BolsaView.tsx` — banner `AlertCircle` ámbar cuando `bolsa_habilitada === false`.
- `CalculoDetailView.tsx` — oculta `COMPENSADO` de las transiciones permitidas + banner explicativo.

---

## 7. Archivos modificados / creados

### Backend
- `app/core/migrations/horas_extras_migration.py` — `crear_tabla_bolsa_ot_override`.
- `app/core/migrations/manager.py` — paso 3.13.
- `app/models/novedades_nomina/bolsa_horas_override.py` — **nuevo** modelo.
- `app/services/novedades_nomina/bolsa_horas_resolver.py` — **nuevo** resolver.
- `app/services/novedades_nomina/seed_horas_extras.py` — seed `BOLSA_GLOBAL_HABILITADA=true`.
- `app/services/novedades_nomina/horas_extras_confirmacion.py` — consulta resolver antes de `_acreditar_bolsa`.
- `app/services/novedades_nomina/horas_extras_workflow.py` — bloqueo COMPENSADO.
- `app/models/novedades_nomina/schemas_horas_extras.py` — 4 schemas nuevos.
- `app/api/novedades_nomina/routers/horas_extras.py` — 4 endpoints nuevos + captura 409.

### Frontend
- `src/types/horasExtras.ts` — 5 tipos nuevos.
- `src/services/horasExtrasService.ts` — 4 funciones nuevas.
- `src/pages/ServicePortal/pages/HORAS_EXTRAS/BolsaView.tsx` — banner desactivada.
- `src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoDetailView.tsx` — filtro COMPENSADO + banner.

### Tests
- `testing/backend/test_horas_extras_s6.py` — **nuevo** con 13 casos.

---

## 8. Riesgos y mitigaciones

- **Bolsa histórica acumulada**: NO se purga al desactivar. Documentado.
- **Cálculos ya CONFIRMADOS**: NO se recalculan. Histórico inalterado.
- **Costo_OT sigue activo**: correcto, no depende de la bolsa.
- **Race condition PUT /admin/bolsa/global + confirmaciones concurrentes**: usar rotación de vigencia con `vigente_hasta=hoy` en la fila previa. Bajo volumen esperado.
- **Reversión de override vs. cálculos ya acreditados**: el resolver decide en el momento de confirmar; no afecta cálculos previos.

---

## 9. Verificación end-to-end

```bash
# Backend
cd backend_v2
docker compose up -d db
python -m pytest ../testing/backend/test_horas_extras_s6.py -v
python -m pytest ../testing/backend/test_horas_extras_s2.py ../testing/backend/test_horas_extras_s4.py -v   # no regresión

# Frontend
cd frontend
npm run lint
npx tsc -p tsconfig.app.json --noEmit

# Smoke test con docker compose up
# 1. Verificar seed BOLSA_GLOBAL_HABILITADA=true en Adminer
# 2. Confirmar un cálculo HED → acredita bolsa
# 3. PUT /admin/bolsa/global {habilitada: false} → siguiente confirmación no acredita
# 4. Verificar COMPENSADO devuelve 409 BOLSA_DESACTIVADA
# 5. Verificar PAGADO sigue OK
# 6. Crear override OT {bolsa_habilitada_override: true} → siguiente confirmación en esa OT sí acredita
# 7. Frontend: BolsaView muestra banner ámbar cuando deshabilitada
```
