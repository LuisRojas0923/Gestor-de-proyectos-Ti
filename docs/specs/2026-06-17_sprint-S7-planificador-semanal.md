# Sprint S7 — Planificador semanal masivo

## Estado
- **Fase**: IMPLEMENT (en curso)
- **Autor**: Agente IA (sesión con el usuario)
- **Fecha**: 2026-06-17
- **Origen del requisito**: el analista de nómina necesita unificar el ingreso de novedades (INC/VAC/AUS/LIC) y el ajuste de horario en una sola pantalla por semana, con cálculo de HE visible al instante y confirmación explícita al cierre.

---

## 1. Objetivo y reglas de negocio

### 1.1 Objetivo

Crear `PlanificadorSemanalView` — vista paralela a `PreLiquidacionView` y `NovedadFormView` que cubre el ciclo semanal completo para N empleados en una sola pantalla:

1. **Inicio de semana**: seleccionar grupo de empleados desde el ERP, asignar horario por defecto.
2. **Durante la semana**: ajustar entradas/salidas/almuerzo por empleado × día. Registrar novedades (INC/VAC/AUS/LIC) en la misma interfaz.
3. **En vivo**: ver pre-cálculo de HE sin persistir nada.
4. **Cierre**: generar `nomina_calculo_semanal` por empleado y UPSERT de costo OT. Si no existe autorización HE efectiva, queda `PENDIENTE_AUTORIZACION` sin crédito de bolsa; la acreditación ocurre al autorizar.

Decisiones validadas con el usuario:
- **Alcance**: nueva vista, NO reemplaza los flujos uno-a-uno existentes.
- **Persistencia**: batch endpoints que reutilizan las tablas existentes (`nomina_horario_pactado_dia`, `nomina_novedad_evento`). Sin nueva tabla cabecera.
- **Confirmación**: estado BORRADOR mientras se ajusta + botón Pre-calcular que muestra HE sin tocar el estado + botón Confirmar que dispara el motor actual (`confirmar_pre_liquidacion`) por empleado.

### 1.2 Flujo del usuario

```
┌─────────────────────────────────────────────────────────┐
│ Planificador Semanal                  [← Volver]        │
├─────────────────────────────────────────────────────────┤
│ Semana: [Año 2026] [Semana ISO 25]                      │
│ 2026-06-15 → 2026-06-21                                 │
├─────────────────────────────────────────────────────────┤
│ Paso 1 — Selecciona empleados del ERP                   │
│   ┌───────────────────────────────────────────────┐     │
│   │ [Buscar...] Juan, Maria, Pedro                │     │
│   └───────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────┤
│ Paso 2 — Horario por defecto                            │
│   Lun Mar Mié Jue Vie Sáb Dom                          │
│   07:30/17:00/60min                                     │
│   [Aplicar a todos]                                     │
├─────────────────────────────────────────────────────────┤
│ Paso 3 — Ajustes por empleado × día                     │
│   ┌──────┬────┬────┬────┬────┬────┬────┬────┐           │
│   │Cédula│Lun │Mar │Mié │Jue │Vie │Sáb │Dom │           │
│   ├──────┼────┼────┼────┼────┼────┼────┼────┤           │
│   │Juan  │7:30│7:30│... │    │    │    │    │           │
│   │      │19:0│17:0│    │    │    │    │    │           │
│   │      │+1.5│    │    │    │    │    │    │           │
│   └──────┴────┴────┴────┴────┴────┴────┴────┘           │
├─────────────────────────────────────────────────────────┤
│ Resumen: Total HE: 24.0h · Costo est.: $937.500         │
├─────────────────────────────────────────────────────────┤
│ [Pre-calcular] [Guardar borrador] [Confirmar semana]    │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Backend — endpoints

### 2.1 Resumen

| Método | Path | Descripción |
|---|---|---|
| GET | `/planificador/empleados-erp` | Lista paginada de empleados del ERP con búsqueda |
| POST | `/horario/registros/bulk` | Upsert masivo de horario + insert masivo de novedades (BORRADOR) |
| POST | `/planificador/pre-calcular` | Cálculo en vivo, SIN persistir |
| POST | `/planificador/confirmar` | Genera cálculo `CONFIRMADO` o `PENDIENTE_AUTORIZACION` por empleado; requiere `nomina_horas_extras.confirmar` |
| POST | `/calculos/{calculo_id}/autorizar` | Autoriza un cálculo pendiente y acredita la bolsa una vez; requiere `nomina_horas_extras.autorizar` |

Permisos requeridos: `nomina_horas_extras.planificar` para borrador/pre-cálculo y `nomina_horas_extras.confirmar` para confirmar.

### 2.2 DTOs clave

```typescript
// Request bulk (mismo para pre-calcular, guardar y como base de confirmar)
interface PlanBulkRequest {
  semana: { anio, semana_iso, fecha_inicio, fecha_fin };
  empleados: [{
    cedula,
    dias: [{
      dia_semana: 1-7,    // 1=Lun, 7=Dom
      hora_entrada: "HH:MM" | null,
      hora_salida: "HH:MM" | null,
      minutos_almuerzo: 0-240,
      cruza_medianoche: boolean,
      actividad?: string | null, // máximo 500; observación diaria
      novedades: [{ codigo_novedad, fecha_inicio, fecha_fin, observaciones? }],
      asignaciones_ot: [{ orden, cc?, scc?, sub_indice?, categoria_sub_indice,
                          descripcion?, cliente?, horas?, porcentaje? }],
    }],
  }];
}

// Response bulk
interface PlanBulkResponse {
  registros_horario_creados: int;
  registros_horario_actualizados: int;
  novedades_creadas: int;
  errores: [{ cedula, motivo }];
}

// Response pre-calcular
interface PlanPreCalculoResponse {
  empleados: [{
    cedula,
    total_horas_trabajadas, total_horas_ordinarias, total_horas_extras,
    total_horas_festivas,
    total_costo_estimado,
    detalle_por_dia: [{ dia, dia_semana, horas_trabajadas, horas_ordinarias,
                        horas_extras, codigo_he, es_festivo, novedad_codigo,
                        costo_estimado,
                        conceptos: [{ codigo, horas, costo_estimado }] }],
  }];
  resumen: { total_horas_extras, total_horas_festivas,
             total_costo_estimado, empleados_count };
}

// Request confirmar
interface PlanConfirmarRequest {
  semana, usuario_confirma,
  empleados: [{
    cedula, dias,
    parametros: {
      nivel_riesgo_arl, factor_prestacional, salario_base_mensual,
      valor_hora_ordinaria, jornada_nocturna,
      ot_id?, ot_codigo?,
    },
  }];
}

// Response confirmar
interface PlanConfirmarResponse {
  calculos: [{ cedula, calculo_id, bolsa_id, horas_acreditadas_bolsa,
               costo_ot_id, bolsa_habilitada_en_confirmacion, bolsa_fuente,
               estado, ok, mensaje }],
  errores: [{ cedula, motivo }],
  resumen: { ok_count, error_count, total_horas_extras,
             total_horas_festivas, total_costo },
}
```

Semántica de borrador: `actividad` se conserva en `sessionStorage` mientras el usuario edita y se persiste de forma durable en `nomina_calculo_diario_detalle.observaciones` al confirmar. El endpoint `/horario/registros/bulk` mantiene el horario pactado, novedades y asignaciones OT, pero no convierte la actividad semanal en un atributo del horario contractual recurrente. `cliente` proviene de la consulta ERP y se usa como dato de presentación; no es una fuente contable autoritativa ni se persiste desde el payload.

Cada empleado admite como máximo siete días y no puede repetir `dia_semana`.

### 2.3 Archivos backend

| Tipo | Ruta |
|---|---|
| Schemas | `backend_v2/app/models/novedades_nomina/schemas_horas_extras_planificador.py` |
| Servicio | `backend_v2/app/services/novedades_nomina/planificador_calculo.py` (pre_calcular) |
| Servicio | `backend_v2/app/services/novedades_nomina/planificador_persistencia.py` (guardar_borrador, confirmar) |
| Clasificación | `backend_v2/app/services/novedades_nomina/planificador_clasificacion.py` (fechas ISO, festivos y conceptos diarios) |
| Helpers | `backend_v2/app/services/novedades_nomina/_planificador_common.py` |
| Router | `backend_v2/app/api/novedades_nomina/routers/horas_extras_planificador.py` |
| ERP | `app/services/erp/empleados_service.listar_empleados_paginado()` |
| Integración | `app/api/novedades_nomina/routers/horas_extras.py` (include_router) |

---

## 3. Frontend

### 3.1 Vista principal

`frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx`

Layout mobile-first, grid responsive. Selector de empleados, herramientas masivas, presentación matriz/tabular, resumen y acciones. Botones Pre-calcular / Guardar borrador / Confirmar.

### 3.2 Sub-componentes

| Componente | Ruta | Función |
|---|---|---|
| `EmpleadosActivosPanel` | `components/EmpleadosActivosPanel.tsx` | Búsqueda, filtros y selección de hasta 200 empleados |
| `HorarioMasivoCard` | `components/HorarioMasivoCard.tsx` | Jornada y novedades para los días seleccionados |
| `AsignacionOtMasivaCard` | `components/AsignacionOtMasivaCard.tsx` | Búsqueda ERP y distribución masiva de OT/CC |
| `SelectorVistaHorario` | `components/SelectorVistaHorario.tsx` | Alterna matriz semanal y vista tabular sin duplicar estado |
| `VistaTabularHorarios` | `components/VistaTabularHorarios.tsx` | Jornadas por empleado con filtros por columna, orden, paginación de 100 filas y edición accesible |
| `CeldaDiaEditor` | `components/CeldaDiaEditor.tsx` | Modal accesible para editar jornada, actividad, novedad y asignaciones OT |
| `ConfirmarSemanaModal` | `components/ConfirmarSemanaModal.tsx` | Confirmación final de la semana |
| `ResumenPlan` | `components/ResumenPlan.tsx` | Totales agregados del plan (HE + costo) |

### 3.3 Servicio y tipos

`frontend/src/services/horasExtrasService.ts` — 4 funciones nuevas:
- `buscarEmpleadosERP(q, limit, offset, token, soloActivos)`
- `guardarBorradorPlan(payload, token)`
- `preCalcularPlan(payload, token)`
- `confirmarPlan(payload, token)`

`frontend/src/types/horasExtrasPlanificador.ts` — contratos del planificador, actividad diaria y cliente ERP.

### 3.4 Routing

`frontend/src/pages/ServicePortal.tsx` — nueva ruta `/service-portal/horas-extras/planificador` (protegida con `nomina_horas_extras`).

`frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/HorasExtrasDashboard.tsx` — nueva tarjeta "Planificador Semanal" en el grid (icono `ListChecks`).

---

## 4. Tests

### 4.1 Backend

`testing/backend/test_horas_extras_s7.py`: borrador, precálculo ordinario, autorización posterior y confirmación.

`testing/backend/test_horas_extras_planificador_festivos.py`:
- 13 de julio de 2026 como `HF`.
- Separación `HF + HEFD` y `HF + HEFN`.
- Prevalencia de `INC` sobre el festivo.
- Semana ISO que cruza de año y validación estricta de fechas.
- Paridad entre precálculo, confirmación y trazabilidad diaria.
- Actividad diaria en el snapshot confirmado y rechazo de días duplicados.

`testing/backend/test_horas_extras_s8_ot_mano_obra.py`:
- Distribución festiva por horas o porcentajes, conciliación de residuo y reversión al anular.

Cédulas prefijo `TEST-S7-*`. OTs 9301-9302.

### 4.2 Frontend

`frontend/src/tests/PlanificadorSemanalView.test.tsx`: flujo principal del planificador.

`frontend/src/tests/PlanificadorSemanalFestivos.test.tsx`: visualización simultánea
`HF + HEFD`, nombre accesible, limpieza al cambiar semana y vista tabular con cliente/OT/CC, actividad masiva y persistencia local.

---

## 5. Reglas de cálculo aplicadas

`planificador_calculo.py` y `planificador_persistencia.py` usan las mismas funciones puras que el motor de confirmación individual (`horas_extras_calculo.py`):
- 8h ordinarias/día, resto HE
- Jornada nocturna → HEN
- Horas ordinarias trabajadas en festivo → HF
- Exceso festivo diurno → HEFD; exceso festivo nocturno → HEFN
- El calendario se carga una vez por operación, incluye años calendario cruzados y falla cerrado
- Novedad (INC/VAC/AUS/LIC) → día suprimido, sin HE
- Jornada normal sin novedad → HED por defecto

Idempotencia: el guardado bulk re-ejecutable actualiza horario existente, no duplica. Las novedades se insertan como eventos independientes (cada uno con su rango de fechas).

---

## 6. Compatibilidad

- **S6 BOLSA_DESACTIVADA**: el cálculo se confirma sin acreditar bolsa y reporta la fuente efectiva.
- **No regresión**: el flujo uno-a-uno (`PreLiquidacionView`, `NovedadFormView`, `HorarioSemanaView`) sigue funcionando sin cambios.

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Grupo grande (>50 empleados) | Backend acepta hasta 200 por request; UI muestra contador N/200 y la vista tabular pagina en bloques de 100 jornadas |
| Actividad semanal confundida con horario contractual | El borrador local conserva la actividad; solo la confirmación la lleva al snapshot diario, sin modificar el horario recurrente |
| Cliente enviado por navegador | Se usa únicamente para presentación; la imputación conserva OT/CC y no confía en cliente como dato contable |
| ERP no disponible | UI muestra mensaje claro + permite digitar cédulas manualmente (en `observaciones`) |
| Pre-cálculo divergente del confirmado | Mismas funciones puras en ambos paths; advertencia visual si cambia la semana entre pre-calcular y confirmar |
| Atomicidad parcial en bulk | `try/except` por empleado con rollback al savepoint implícito; errores van a `errores[]` |
| RBAC | Planificación y confirmación usan permisos granulares independientes |
| Edición concurrente | Última escritura gana; sin locking en S7 |

---

## 8. Verificación end-to-end

```bash
# Backend
cd backend_v2
docker compose up -d db
python -m pytest ../testing/backend/test_horas_extras_s7.py -v
python -m pytest ../testing/backend/test_horas_extras_s2.py ../testing/backend/test_horas_extras_s4.py ../testing/backend/test_horas_extras_s6.py -v   # no regresión

# Frontend
cd ../frontend
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npm run test -- src/tests/PlanificadorSemanalView.test.tsx

# Smoke E2E
# 1. Login como analista de nómina
# 2. /service-portal/horas-extras/planificador → semana 25 de 2026
# 3. Buscar "Juan" en ERP → seleccionar 3 empleados
# 4. Set default horario Lun-Vie 7:30/17:00 + 60min almuerzo
# 5. Click "Aplicar a todos" → ver 3 filas × 7 días con valores
# 6. Cambiar a "Vista tabular" → filtrar por cédula/cliente y verificar OT/CC/total
# 7. Escribir actividad, seleccionar días y aplicar; recargar y comprobar el borrador local
# 8. Editar una fila → cambiar jornada/actividad o agregar novedad AUS
# 9. Click "Pre-calcular" → revisar resumen y volver a la vista tabular
# 10. Click "Guardar borrador" → persiste horario/OT/novedades; la actividad sigue local
# 11. Click "Confirmar semana" → modal → confirmar
# 12. Redirige a /calculos con 3 nuevos cálculos
# 13. Verificar actividad en observaciones del snapshot diario
# 14. Si global bolsa=false (S6): repetir 11 → confirmar sin crédito y revisar `bolsa_fuente`
```
