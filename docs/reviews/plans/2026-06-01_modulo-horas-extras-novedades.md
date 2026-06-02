# Plan — Módulo de Horas Extras y Novedades (cálculo automático)

**Fecha:** 2026-06-01
**Plan:** Reemplazar la plantilla Excel `5.Formulario Reporte de Novedades Regionales` por un módulo web que recibe horarios/marcas y calcula automáticamente horas extras, recargos y demás novedades de nómina conforme a la Ley 2466 de 2025 (Reforma Laboral colombiana).
**Autor del plan:** Agente IA (sesión con el usuario)
**Modo:** plan → build (aprobado por el usuario)
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

Construir un módulo dentro del portal de servicios (FastAPI + React) que permita a los responsables regionales (p. ej. CAMILA BAHOZ) capturar, validar y firmar marcas (clock-in/out) de los empleados, con el fin de que el sistema **calcule automáticamente** los minutos de:

- **Horas extras y recargos** según Ley 2466/2025 y CST arts. 158-168 (HED, HEN, HEFD, HEFN, HF, RN, RF).
- **Otras novedades** que ya recibía la planilla Excel: permisos remunerados (REM), licencias remuneradas (LIC), incapacidades (INC), vacaciones (VAC), permisos no remunerados (PNR), retiros (RET), compensatorios (CMP), ARL, AUS, SAN, DXT y SALARIO.

El sistema entrega **minutos desglosados por concepto** (no valores en COP). El sistema externo de nómina consume estos minutos y aplica los factores monetarios.

El módulo mantiene una **bolsa de horas** por empleado (ratio legal 1.5:1, Art. 17 Ley 2466/2025) configurable y con vigencia parametrizable.

### Problema concreto que resuelve

La plantilla `5.Formulario Reporte de Novedades Regionales 6 DE MARZO-20MARZO..xlsm` (1.212 registros, 58 empleados) recibe **los recargos ya calculados manualmente** por el responsable regional. Esto genera demoras, errores (en el archivo se detectaron 85 excesos del límite legal de 2 h/día, 6 excesos de 12 h/semana, y 317,5 h de "festivos" aplicadas en un periodo sin festivos en Colombia).

---

## 2. No-objetivos

- **NO** se calculan valores en COP. El módulo entrega minutos por concepto.
- **NO** se almacenan adjuntos / soportes documentales. La información se registra en un campo de texto libre (`descripcion_libre`).
- **NO** se implementa marcación biométrica ni geolocalización en esta entrega. El modelo de datos queda preparado (campos `latitud`, `longitud`, `biometria_hash`, `device_id` nullable) para una fase futura con app móvil.
- **NO** se reemplazan las subcategorías `PLANILLAS REGIONALES 1Q/2Q` del módulo `novedades_nomina` actual. El nuevo módulo es **adicional** y convive con el flujo Excel pararetrocompatibilidad.
- **NO** se modifica el modelo de multi-empresa del ERP (`establecimiento`). Solo se consume como lectura.
- **NO** se hace recálculo retroactivo si cambian los parámetros legales (los registros firmados son inmutables, versionados).

---

## 3. Reglas de negocio confirmadas (fuente de verdad)

| # | Regla | Valor / Implementación |
|---|---|---|
| 1 | **Bolsa de horas** | Ratio 1 h HE → **1.5 h** descanso compensatorio (Art. 17 Ley 2466/2025). Vigencia parametrizable en `nomina_parametros_legales.bolsa_vigencia_semanas` (default 4). |
| 2 | **Sin uploads** | Solo campo `descripcion_libre` para detalle (ej. INC: "Incapacidad desde 10/03/2026 según cronograma médico"). |
| 3 | **Calendarific** | Variable `CALENDARIFIC_API_KEY` vacía en `.env` por ahora. Si vacía o falla la API → fallback automático a tabla hardcodeada con la **Ley Emiliani** (Ley 51 de 1983). |
| 4 | **Jornada semanal** | Parametrizable por empleado. Estructura `(cedula, dia_semana, hora_entrada, hora_salida, minutos_jornada)`. Default legal: 44 h/sem hasta 14-jul-2026, 42 h/sem desde 15-jul-2026. |
| 5 | **Empleados** | Se leen del ERP vía `obtener_erp_db_opcional()`, tabla `establecimiento`. Validación: la cédula debe estar activa. Sin multi-empresa en este módulo. |
| 6 | **Cálculo monetario** | No se hace. El módulo entrega minutos por concepto. El sistema de nómina externo los consume. |
| 7 | **Workflow** | Máquina de estados `BORRADOR → FIRMADO → APROBADO → PAGADO`. Solo `FIRMADO` puede pasar a `APROBADO`. Solo `APROBADO` puede pasar a `PAGADO`. Cada transición se audita. |
| 8 | **Límites HE** | 2 h/día, 12 h/semana (Art. 13 Ley 2466/2025). Warning visual, no bloqueo (consistente con la política del Excel actual). |
| 9 | **Jornada nocturna** | 19:00 a 06:00 (Art. 10 Ley 2466/2025, vigente desde 25-dic-2025). Recargo 35 % sobre hora ordinaria. |
| 10 | **Recargo dominical/festivo** | Progresivo: 80 % (jul-2025 a jun-2026), 90 % (jul-2026 a jun-2027), 100 % (jul-2027+). Se lee de `nomina_parametros_legales.vigencia`. |
| 11 | **Horas extra festiva diurna** | (HE diurna 25 %) + (recargo dominical/festivo) = 105 % (ene-jun/26) / 115 % (jul-dic/26). |
| 12 | **Hora extra festiva nocturna** | (HE nocturna 75 %) + (recargo dominical/festivo) = 155 % (ene-jun/26) / 165 % (jul-dic/26). |

---

## 4. Modelo de datos (8 tablas nuevas)

### 4.1 `nomina_horario_pactado`
Configuración semanal por empleado. Varios registros por cédula (uno por día).

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| cedula | VARCHAR(50) NOT NULL | |
| dia_semana | SMALLINT NOT NULL | 0=domingo … 6=sábado |
| hora_entrada | TIME NOT NULL | |
| hora_salida | TIME NOT NULL | |
| minutos_jornada | INT NOT NULL | |
| vigente_desde | DATE NOT NULL | |
| vigente_hasta | DATE NULL | |
| observaciones | TEXT NULL | |
| INDEX | (cedula, dia_semana, vigente_desde) | |

### 4.2 `nomina_marca_timelog`
Clock in/out por empleado y día. Manual ahora, biométrico después.

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| cedula | VARCHAR(50) NOT NULL | |
| fecha | DATE NOT NULL | |
| hora_entrada_real | TIMESTAMP NULL | |
| hora_salida_real | TIMESTAMP NULL | |
| minutos_trabajados | INT NOT NULL DEFAULT 0 | calculado |
| origen | ENUM('MANUAL','MASIVO','BIOMETRICO_APP','RFID','QR') NOT NULL DEFAULT 'MANUAL' | |
| latitud | NUMERIC(10,7) NULL | futuro |
| longitud | NUMERIC(10,7) NULL | futuro |
| biometria_hash | TEXT NULL | futuro |
| device_id | TEXT NULL | futuro |
| ot_cc_id | INT NULL | |
| registrado_por | INT NOT NULL | usuario |
| created_at | TIMESTAMP DEFAULT now() | |
| UNIQUE | (cedula, fecha) | una marca por día por empleado |

### 4.3 `nomina_novedad_registro`
Tabla unificada de novedades. Incluye HED/HEN/.../HF/RN/RF y también REM/LIC/INC/VAC/PNR/RET/CMP/ARL/AUS/SAN/DXT/SALARIO.

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| cedula | VARCHAR(50) NOT NULL | |
| fecha | DATE NOT NULL | |
| tipo_novedad | ENUM(arriba) NOT NULL | |
| unidad | ENUM('HORAS','DIAS') NOT NULL | |
| cantidad | NUMERIC(8,2) NOT NULL | |
| descripcion_libre | TEXT NULL | sustituye al upload |
| ot_cc_id | INT NULL | |
| estado | ENUM('BORRADOR','FIRMADO','APROBADO','PAGADO') NOT NULL DEFAULT 'BORRADOR' | |
| registrado_por | INT NOT NULL | |
| aprobado_por | INT NULL | |
| pagado_en | TIMESTAMP NULL | |
| created_at | TIMESTAMP DEFAULT now() | |
| updated_at | TIMESTAMP NULL | |
| calculo_semanal_id | INT NULL FK | |
| INDEX | (cedula, fecha, tipo_novedad, estado) | |

### 4.4 `nomina_calculo_semanal`
Resultado del cálculo. **No incluye valor en COP.**

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| cedula | VARCHAR(50) NOT NULL | |
| anio | SMALLINT NOT NULL | |
| semana_iso | SMALLINT NOT NULL | 1-53 |
| periodo_desde | DATE NOT NULL | |
| periodo_hasta | DATE NOT NULL | |
| minutos_ordinarios | INT NOT NULL DEFAULT 0 | |
| minutos_hed | INT NOT NULL DEFAULT 0 | |
| minutos_hen | INT NOT NULL DEFAULT 0 | |
| minutos_hefd | INT NOT NULL DEFAULT 0 | |
| minutos_hefn | INT NOT NULL DEFAULT 0 | |
| minutos_hf | INT NOT NULL DEFAULT 0 | |
| minutos_rn | INT NOT NULL DEFAULT 0 | |
| minutos_rf | INT NOT NULL DEFAULT 0 | |
| minutos_rem | INT NOT NULL DEFAULT 0 | días en minutos (8 h = 480) |
| minutos_lic | INT NOT NULL DEFAULT 0 | |
| minutos_inc | INT NOT NULL DEFAULT 0 | |
| minutos_bolsa_credito | INT NOT NULL DEFAULT 0 | (HED+HEN+HEFD+HEFN) × 1.5 |
| salario_base_referencial | NUMERIC(12,2) NULL | solo auditoría |
| jornada_legal_vigente | VARCHAR(10) NOT NULL | '44h' o '42h' |
| recargo_dominical_pct | NUMERIC(5,2) NOT NULL | 80, 90 o 100 |
| estado | ENUM('BORRADOR','FIRMADO','APROBADO','PAGADO') NOT NULL DEFAULT 'BORRADOR' | |
| version | INT NOT NULL DEFAULT 1 | |
| calculado_en | TIMESTAMP DEFAULT now() | |
| calculado_por | INT NOT NULL | |
| UNIQUE | (cedula, anio, semana_iso, version) | |

### 4.5 `nomina_bolsa_horas_saldo`
Snapshot semanal auditable.

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| cedula | VARCHAR(50) NOT NULL | |
| anio | SMALLINT NOT NULL | |
| semana_iso | SMALLINT NOT NULL | |
| minutos_saldo_inicial | INT NOT NULL DEFAULT 0 | |
| minutos_debito | INT NOT NULL DEFAULT 0 | compensaciones usadas |
| minutos_credito | INT NOT NULL DEFAULT 0 | nuevos créditos |
| minutos_saldo_final | INT NOT NULL DEFAULT 0 | |
| vigente_hasta | DATE NOT NULL | |
| UNIQUE | (cedula, anio, semana_iso) | |

### 4.6 `nomina_festivo_calendario`
Tabla de festivos (poblada desde Calendarific o Ley Emiliani).

| Columna | Tipo | Notas |
|---|---|---|
| fecha | DATE PK | |
| nombre | TEXT NOT NULL | |
| fuente | ENUM('CALENDARIFIC','LEY_EMILIANI') NOT NULL | |
| anio | SMALLINT NOT NULL | |
| INDEX | (anio) | |

### 4.7 `nomina_parametros_legales`
Tabla editable, versionada, inmutable una vez vigente.

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| vigencia_desde | DATE NOT NULL | |
| vigencia_hasta | DATE NULL | |
| jornada_semanal_h | INT NOT NULL | 44 / 42 |
| hora_ordinaria_base | NUMERIC(12,2) NULL | referencia |
| recargo_dominical_pct | NUMERIC(5,2) NOT NULL | 80, 90, 100 |
| recargo_nocturno_pct | NUMERIC(5,2) NOT NULL DEFAULT 35 | |
| hora_nocturna_inicio | TIME NOT NULL DEFAULT '19:00:00' | |
| hora_nocturna_fin | TIME NOT NULL DEFAULT '06:00:00' | |
| limite_he_diario_min | INT NOT NULL DEFAULT 120 | |
| limite_he_semanal_min | INT NOT NULL DEFAULT 720 | |
| bolsa_ratio_credito | NUMERIC(4,2) NOT NULL DEFAULT 1.5 | |
| bolsa_vigencia_semanas | INT NOT NULL DEFAULT 4 | |
| activo | BOOL NOT NULL DEFAULT TRUE | |
| creado_por | INT NOT NULL | |
| creado_en | TIMESTAMP DEFAULT now() | |

### 4.8 `nomina_auditoria_estado`
Log de transiciones de workflow.

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| tabla_origen | VARCHAR(100) NOT NULL | |
| registro_id | INT NOT NULL | |
| estado_anterior | VARCHAR(20) NULL | |
| estado_nuevo | VARCHAR(20) NOT NULL | |
| usuario_id | INT NOT NULL | |
| justificacion | TEXT NULL | |
| created_at | TIMESTAMP DEFAULT now() | |
| INDEX | (tabla_origen, registro_id, created_at) | |

---

## 5. Archivos y módulos afectados

### 5.1 Backend

```
backend_v2/app/
├── models/novedades_nomina/
│   ├── horarios.py                     [NUEVO]  ← 8 modelos arriba
│   └── __init__.py                     [MOD]     ← exporta nuevos modelos
├── api/novedades_nomina/
│   ├── nomina_router.py                [MOD]     ← incluye nuevos routers
│   ├── schemas/
│   │   ├── horarios_schemas.py         [NUEVO]
│   │   ├── novedades_schemas.py        [NUEVO]
│   │   ├── calculo_schemas.py          [NUEVO]
│   │   └── parametros_schemas.py       [NUEVO]
│   └── routers/
│       ├── horarios.py                 [NUEVO]  ← CRUD marcas + masivo
│       ├── novedades.py                [NUEVO]  ← CRUD unificado
│       ├── calculo.py                  [NUEVO]  ← preview/confirmar
│       ├── bolsa.py                    [NUEVO]  ← saldos
│       ├── workflow.py                 [NUEVO]  ← transiciones
│       └── parametros.py               [NUEVO]
├── services/novedades_nomina/
│   ├── calculo_horas_service.py        [NUEVO]  ← motor puro Ley 2466/2025
│   ├── bolsa_horas_service.py          [NUEVO]
│   ├── catalogo_conceptos.py           [NUEVO]
│   ├── calendarific_client.py          [NUEVO]  ← con fallback
│   ├── festivos_colombia.py            [NUEVO]  ← Ley Emiliani
│   ├── workflow_service.py             [NUEVO]
│   ├── parametros_service.py           [NUEVO]
│   └── erp_empleados_service.py        [NUEVO]  ← wrapper establecimiento
└── core/
    └── rbac_manifest.py                [MOD]     ← 6 entradas nuevas
```

### 5.2 Frontend

```
frontend/src/
├── pages/ServicePortal/pages/NOVEDADES_NOMINA/
│   ├── RegistroHorasExtras.tsx         [NUEVO]  ← shell con tabs
│   ├── RegistroHorasExtras/
│   │   ├── RegistroIndividual.tsx      [NUEVO]
│   │   ├── RegistroMasivo.tsx          [NUEVO]
│   │   └── GestionCalendario.tsx       [NUEVO]
│   ├── NovedadesGenerales/
│   │   ├── ListadoNovedades.tsx        [NUEVO]
│   │   ├── FormularioNovedad.tsx       [NUEVO]
│   │   └── SoporteTextoLibre.tsx       [NUEVO]  ← textarea, no upload
│   ├── CalculoSemanal/
│   │   ├── PreviewCalculo.tsx          [NUEVO]
│   │   └── ConfirmarCalculo.tsx        [NUEVO]
│   ├── BolsaHoras/
│   │   ├── ResumenBolsa.tsx            [NUEVO]
│   │   └── CompensarHoras.tsx          [NUEVO]
│   ├── ParametrosLegales/
│   │   └── ConfiguracionParametros.tsx [NUEVO]
│   ├── components/
│   │   ├── TimePickerDual.tsx          [NUEVO]
│   │   ├── HorarioSemanalEditor.tsx    [NUEVO]
│   │   ├── ConceptoNovedadSelect.tsx   [NUEVO]
│   │   ├── WorkflowBadge.tsx           [NUEVO]
│   │   ├── WorkflowTimeline.tsx        [NUEVO]
│   │   ├── CalendarificStatusBadge.tsx [NUEVO]
│   │   └── BolsaHorasCard.tsx          [NUEVO]
│   └── NominaDashboard.tsx             [MOD]    ← añade tarjeta
└── services/
    └── horasExtrasService.ts           [NUEVO]  ← axios client
```

### 5.3 Tests

```
testing/backend/
├── test_calculo_horas_puro.py          [NUEVO]  ← TDD primero
├── test_bolsa_horas.py                 [NUEVO]
├── test_workflow_estados.py            [NUEVO]
├── test_horas_extras_api.py            [NUEVO]
├── test_calendarific_fallback.py       [NUEVO]
├── test_novedades_registro.py          [NUEVO]
├── test_parametros_legales.py          [NUEVO]
└── test_horario_pactado_semanal.py     [NUEVO]
```

### 5.4 Documentación

```
docs/
├── ESQUEMA_BASE_DATOS.md               [MOD]    ← añadir 8 tablas nuevas
├── ARQUITECTURA_FRONTEND.md            [MOD]    ← nueva sección
├── GUIA_DESARROLLO.md                  [MOD]    ← cómo crear un parámetro
└── decisions/ADR-004-modulo-horas-extras.md [NUEVO]
```

### 5.5 Otros

```
.env                                   [MOD]     ← añadir CALENDARIFIC_API_KEY=""
backend_v2/scripts/seed_ley_emiliani.py [NUEVO]  ← festivos 2026-2030
backend_v2/scripts/seed_parametros_2026.py [NUEVO]
backend_v2/app/core/migrations/
└── versiones_horas_extras.py           [NUEVO]  ← Alembic autogenerate
```

---

## 6. Endpoints REST (resumen)

```
GET    /novedades-nomina/parametros-legales/vigente
PUT    /novedades-nomina/parametros-legales/{id}                  ← admin
GET    /novedades-nomina/empleados/buscar?cedula=&q=
GET    /novedades-nomina/horario-pactado/{cedula}
POST   /novedades-nomina/horario-pactado                          ← upsert
GET    /novedades-nomina/marcas?cedula=&desde=&hasta=
POST   /novedades-nomina/marcas                                   ← batch
POST   /novedades-nomina/marcas/masivo                            ← CSV/XLSX
GET    /novedades-nomina/novedades?tipo=&cedula=&estado=
POST   /novedades-nomina/novedades                                ← incluye REM/LIC/INC
PATCH  /novedades-nomina/novedades/{id}                           ← solo BORRADOR
POST   /novedades-nomina/workflow/{tabla}/{id}/transicion         ← body {estado_destino, justificacion}
GET    /novedades-nomina/calculo/preview?cedula=&anio=&semana=
POST   /novedades-nomina/calculo/confirmar
GET    /novedades-nomina/calculo/{cedula}?anio=&semana=
GET    /novedades-nomina/bolsa/{cedula}
POST   /novedades-nomina/bolsa/compensar
GET    /novedades-nomina/festivos/{anio}?fuente=auto|calendarific|emiliani
```

## 7. RBAC — entradas nuevas en `rbac_manifest.py`

```python
{"id": "nomina.horas_extras.registro",  "nombre": "Registro de Horas Extras y Marcas",              "categoria": "analistas", "es_critico": False, "descripcion": "Captura marcas y novedades."},
{"id": "nomina.novedades.registro",     "nombre": "Registro de Novedades (REM/LIC/INC)",           "categoria": "analistas", "es_critico": False, "descripcion": "Permisos, licencias, incapacidades."},
{"id": "nomina.calculo.preview",        "nombre": "Cálculo semanal de horas extras",                "categoria": "analistas", "es_critico": False, "descripcion": "Vista previa del cálculo semanal."},
{"id": "nomina.calculo.aprobacion",     "nombre": "Aprobación / Firma de cálculo semanal",          "categoria": "analistas", "es_critico": True,  "descripcion": "Firma, aprobación y pago de cálculos semanales."},
{"id": "nomina.bolsa.consulta",         "nombre": "Consulta de bolsa de horas",                     "categoria": "analistas", "es_critico": False, "descripcion": "Saldos y movimientos de la bolsa."},
{"id": "nomina.parametros.admin",       "nombre": "Administración de parámetros legales",          "categoria": "analistas", "es_critico": True,  "descripcion": "Configuración de tabla de parámetros legales."},
```

## 8. Plan de implementación por sprints (7 sprints)

| Sprint | Entregable | Bloqueado por | Estimación |
|---|---|---|---|
| **S0** | Migración Alembic con 8 tablas + seed parámetros 2026 + seed Ley Emiliani 2026-2030 + 6 entradas RBAC en `rbac_manifest.py` | — | 0.5 d |
| **S1** | `calculo_horas_service.py` puro + `catalogo_conceptos.py` + tests TDD (motor primero, casos borde) | S0 | 1.5 d |
| **S2** | `bolsa_horas_service.py` + `workflow_service.py` + `erp_empleados_service.py` + tests | S0 | 1 d |
| **S3** | Routers: `horarios`, `novedades`, `parametros`, `workflow`, `festivos`. Calendarific con fallback. Tests API + RBAC | S1, S2 | 1.5 d |
| **S4** | Routers: `calculo` (preview/confirmar), `bolsa`. Integración con motor + bolsa. Tests | S3 | 1 d |
| **S5** | UI: `RegistroIndividual`, `ListadoNovedades`, `FormularioNovedad`, `SoporteTextoLibre`, `WorkflowBadge/Timeline` | S4 | 1.5 d |
| **S6** | UI: `RegistroMasivo`, `HorarioSemanalEditor`, `GestionCalendario`, `PreviewCalculo`, `ConfirmarCalculo`, `ResumenBolsa`, `CompensarHoras`, `ConfiguracionParametros` | S5 | 2 d |
| **S7** | E2E completo (captura → borrador → firmado → aprobado → pagado), métricas, docs, runbook | S6 | 1 d |

**Total estimado:** ~9.5 días-hombre de desarrollo.

## 9. Comandos de validación

```bash
# Backend - migraciones
docker compose exec backend alembic upgrade head
docker compose exec backend alembic downgrade -1

# Backend - tests TDD
pytest testing/backend/test_calculo_horas_puro.py -v
pytest testing/backend/test_bolsa_horas.py -v
pytest testing/backend/test_workflow_estados.py -v
pytest testing/backend/test_horas_extras_api.py -v
pytest testing/backend/test_calendarific_fallback.py -v
pytest testing/backend/test_novedades_registro.py -v
pytest testing/backend/test_parametros_legales.py -v
pytest testing/backend/test_horario_pactado_semanal.py -v

# Suite completa
pytest testing/backend/ -v

# Frontend
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run test
```

## 10. Impacto en documentación

- [ ] `docs/ESQUEMA_BASE_DATOS.md` — agregar 8 tablas nuevas con sus relaciones
- [ ] `docs/ARQUITECTURA_FRONTEND.md` — nueva sección "Módulo de Horas Extras y Novedades"
- [ ] `docs/GUIA_DESARROLLO.md` — cómo crear un nuevo parámetro legal
- [ ] `docs/decisions/ADR-004-modulo-horas-extras.md` — decisión arquitectural durable
- [ ] `docs/bitacora/2026-06-01-modulo-horas-extras.md` — bitácora de la sesión

## 11. Evaluación de riesgos

| # | Riesgo | Probabilidad | Mitigación |
|---|---|---|---|
| 1 | Cálculo incorrecto de horas extras en cruces de medianoche | M | Tests TDD del motor puro con casos borde específicos (turno 22:00-06:00, festivo nocturno) |
| 2 | Cambio normativo (SMMLV, jornada, recargos) en mitad de año | A | `nomina_parametros_legales` versionada por `vigencia_desde/vigencia_hasta`. Cálculos viejos son inmutables |
| 3 | Calendarific no disponible o key inválida | M | Fallback automático a tabla Ley Emiliani. Test unitario con mock caído |
| 4 | Empleados inactivos en ERP generan registros huérfanos | M | Validación de cédula activa en cada POST. Endpoint de búsqueda devuelve solo activos |
| 5 | Sincronización con nómina externa se rompe | B | Módulo entrega **solo minutos por concepto** vía endpoint. Interfaz estable. Contrato en `docs/API_HORAS_EXTRAS.md` |
| 6 | Carga masiva de marcas con errores de formato | M | Vista previa con `DataTable` + mapeo de columnas + validación antes de confirmar |
| 7 | Multi-empresa implícito en algunos empleados | B | Filtrar por `establecimiento.empresa` del usuario autenticado en cada endpoint |
| 8 | Planilla Excel 1Q/2Q rota al coexistir con el nuevo módulo | B | El nuevo módulo no toca `nomina_archivos`, `nomina_registros_crudos` ni `nomina_registros_normalizados`. Solo añade tablas |
| 9 | Workflow mal usado (saltar estados) | M | Máquina de estados en backend, transiciones inválidas devuelven 409. Tests explícitos |
| 10 | Saldo de bolsa se vuelve infinito | B | `bolsa_vigencia_semanas` por defecto 4. Job nocturno que vence saldos antiguos |

## 12. Matriz de subagentes

```text
Subagente            | Motivo                                                          | Resultado                | Bloquea
---------------------|-----------------------------------------------------------------|--------------------------|--------
scope-reviewer       | Siempre en plan                                                 | approved                 | no
backend-reviewer     | Cambios en backend_v2/app/api/novedades_nomina/ + nuevos models  | pending (revisar S0)     | no
frontend-reviewer    | Nueva página y componentes en ServicePortal/pages/NOVEDADES_NOMINA | pending (revisar S5)  | no
docs-tests-reviewer  | 8 tests nuevos + docs ESQUEMA_BASE_DATOS + ADR                  | pending (revisar S0)     | no
security-rbac-reviewer | 6 entradas RBAC + validación cédula ERP + auth por endpoint  | pending (revisar S0)     | no
error-memory         | Memoria de errores deprecados de la plantilla Excel             | pending (revisar S0)     | no
mobile-reviewer      | NO APLICA (no se modifica modulo_actividades_fork)              | n/a                      | no
```

## 13. Decisión final

- [x] `aprobado` (por el usuario, en sesión)
- [x] `aprobado_con_riesgos` (riesgos documentados arriba)

## 14. Notas adicionales

### Compatibilidad con la planilla Excel actual

El endpoint `planillas_regionales_1q/preview` y `planillas_regionales_2q/preview` siguen funcionando idénticos. La nueva UI es **adicional**: los regionales podrán seguir cargando el Excel para periodos pasados y usar el nuevo módulo para captura en tiempo real. El campo `nomina_calculo_semanal.origen_calculo` (a añadir si se requiere) soportaría `AUTO|EXCEL|MIXTO` para trazabilidad.

### Fase futura (fuera de alcance)

Una vez completado este módulo, una fase posterior podrá añadir:

- App móvil (React Native o PWA) con marcación biométrica facial + geolocalización → llena los campos `latitud`, `longitud`, `biometria_hash`, `device_id` de `nomina_marca_timelog`.
- Integración con reloj biométrico físico (ZKTeco, Hikvision) vía `origen='RFID'`.
- Sincronización bidireccional con la planilla Excel 1Q/2Q: si la planilla trae un cálculo, se compara con el cálculo automático y se reportan discrepancias.
- Sincronización con el sistema externo de nómina para enviar los minutos por concepto y recibir la retroalimentación de novedades del periodo.

### Anexo: Datos del Excel que se está reemplazando

Para contexto histórico, el archivo `docs/5.Formulario Reporte de Novedades Regionales 6 DE MARZO-20MARZO..xlsm` contiene:

- 1.212 registros, 58 empleados, 1 responsable regional (CAMILA BAHOZ).
- Distribución: SALARIO 832, HED 144, CMP 125, HF 34, HEFD 15, HEN 14, INC 12, RF 10, RN 9, VAC 5, PNR 5, RET 4, HEFN 3.
- Total HE: 514,2 h HED + 25 h HEN + 31 h HEFD + 3 h HEFN = 573,2 h.
- Anomalías detectadas: 85 excesos del límite 2 h/día, 6 excesos de 12 h/semana, 317,5 h con "recargo festivo" en periodo sin festivos nacionales.

El nuevo módulo elimina todas estas anomalías en origen al calcular automáticamente.
