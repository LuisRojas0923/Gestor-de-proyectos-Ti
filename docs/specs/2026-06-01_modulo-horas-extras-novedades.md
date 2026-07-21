# Especificación Técnica: Módulo de Horas Extras y Novedades (cálculo automático Ley 2466/2025)

## Estado
- **Fase**: SPECIFY
- **Autor**: Agente IA (sesión con el usuario)
- **Fecha**: 2026-06-01
- **Plan relacionado**: `docs/reviews/plans/2026-06-01_modulo-horas-extras-novedades.md`

---

## 1. Objetivos y Reglas de Negocio

### 1.1 Objetivo

Reemplazar la planilla Excel `5.Formulario Reporte de Novedades Regionales` (1.212 registros, 58 empleados, con errores como 85 excesos del límite de 2 h/día y 317,5 h con recargo festivo en un periodo sin festivos en Colombia) por un módulo web que **recibe los horarios/marcas** y **calcula automáticamente** los minutos por concepto, conforme al CST arts. 158-168 y la Ley 2466 de 2025.

### 1.2 Salidas del módulo

El módulo entrega **minutos desglosados por concepto** y, para pre-liquidación/confirmación de Horas Extras, calcula importes referenciales en COP con salario/ARL resueltos desde ERP.

| Concepto | Salida |
|---|---|
| HED, HEN, HEFD, HEFN, HF, RN, RF | minutos en `nomina_calculo_semanal` |
| REM, LIC, INC, VAC, PNR, RET, CMP, ARL, AUS, SAN, DXT, SALARIO | minutos (días × 480) en `nomina_calculo_semanal` |
| Bolsa de horas | minutos crédito/débito/saldo en `nomina_bolsa_horas_saldo` |
| Detalle por día | minutos por marca en `nomina_marca_timelog` y snapshot auditable en `nomina_calculo_diario_detalle` al confirmar |
| Detalle de novedad | registro individual en `nomina_novedad_registro` |

### 1.3 Reglas de cálculo (motor puro)

#### Constantes legales (`nomina_parametros_legales`)

| Parámetro | Valor ene-jun 2026 | Valor jul-dic 2026 | Valor jul 2027+ |
|---|---|---|---|
| `jornada_semanal_h` | 44 | 42 | 42 |
| `recargo_dominical_pct` | 80 | 90 | 100 |
| `recargo_nocturno_pct` | 35 | 35 | 35 |
| `hora_nocturna_inicio` | 19:00 | 19:00 | 19:00 |
| `hora_nocturna_fin` | 06:00 | 06:00 | 06:00 |
| `limite_he_diario_min` | 120 | 120 | 120 |
| `limite_he_semanal_min` | 720 | 720 | 720 |
| `bolsa_ratio_credito` | 1.5 | 1.5 | 1.5 |
| `bolsa_vigencia_semanas` | 4 (configurable) | 4 | 4 |

#### Algoritmo principal (función pura `calcular_horas_extras`)

**Entrada:** `marca: NominaMarcaTimelog`, `horario_pactado: NominaHorarioPactado`, `festivos: Set[date]`, `parametros: NominaParametrosLegales`.

**Salida:** `Dict[str, int]` con claves `minutos_ordinarios`, `minutos_hed`, `minutos_hen`, `minutos_hefd`, `minutos_hefn`, `minutos_hf`, `minutos_rn`, `minutos_rf`.

**Pasos:**

1. **Validar entrada.** Cédula activa en ERP. Marca con `hora_entrada_real < hora_salida_real`. Horario pactado vigente para el día.

2. **Determinar si el día es festivo o dominical.**
   - `es_festivo = marca.fecha in festivos`
   - `es_dominical = marca.fecha.weekday() == 6  # domingo`
   - `es_fin_de_semana = marca.fecha.weekday() in (5, 6)  # sábado, domingo`

3. **Cortar la marca contra el horario pactado.**
   - Obtener `horario_pactado` del día (lun-dom). Si no existe, error `HORARIO_NO_DEFINIDO`.
   - `jornada_pactada_inicio = marca.fecha + horario.hora_entrada`
   - `jornada_pactada_fin = marca.fecha + horario.hora_salida`
   - Caso A: la marca está completamente dentro de la jornada → todo es `minutos_ordinarios`.
   - Caso B: la marca inicia antes → minutos antes de la jornada se consideran HE. Si ese tramo cruza las 19:00, parte es HED y parte HEN.
   - Caso C: la marca termina después → minutos después de la jornada se consideran HE con la misma lógica de corte por 19:00/06:00.
   - Caso D: la marca cruza medianoche → partir en dos y tratar cada tramo por separado (este caso es raro para un turno regular, pero el motor debe soportarlo).

4. **Detectar tramo nocturno.** Un minuto está en horario nocturno si la hora-local está entre `parametros.hora_nocturna_inicio` y `parametros.hora_nocturna_fin` (con cruce de medianoche). Tramo nocturno ×35 % = `RN` dentro de jornada, `HEN`/`HEFN` si es extra.

5. **Detectar día festivo/dominical.** Si `es_festivo or es_dominical`:
   - Los minutos dentro de la jornada pactada (no extra) se clasifican como `HF` (Hora Festiva, recargo dominical).
   - Los minutos extra en ese día se clasifican como `HEFD` o `HEFN` según tramo horario.
   - Aplicar `recargo_dominical_pct` vigente en la fecha.

6. **Aplicar factores.** (El motor solo reporta minutos por concepto, NO calcula valor.) Cada minuto HE/recargo se incrementa por el factor correspondiente en la capa de reporte (futuro), pero en este módulo simplemente se desglosa.

7. **Validar límites.** Si `minutos_hed + minutos_hen + minutos_hefd + minutos_hefn > parametros.limite_he_diario_min`, registrar `WARNING` con código `LIMITE_HE_DIARIO_EXCEDIDO` y continuar (no bloquear, igual que el Excel actual). Idem semanal.

#### Casos borde del motor (deben estar en los tests)

| Caso | Entrada | Salida esperada |
|---|---|---|
| Marca completa en jornada diurna | 7:00–15:00 en lunes no festivo | 480 min ordinarios, 0 HE |
| Marca completa en jornada nocturna (turno fijo) | 19:00–03:00 en lunes no festivo | 240 min RN, 240 min ordinarios (o solo RN si la jornada es nocturna pactada) |
| Hora extra diurna | Jornada 7:00–15:00, marca 7:00–17:00 | 480 ord + 120 HED |
| Hora extra nocturna | Jornada 7:00–15:00, marca 7:00–20:00 | 480 ord + 60 HED (15-17) + 120 HEN (17-20 menos solapamiento con 19:00) — **detalle exacto a verificar en tests** |
| Hora extra dominical diurna | Marca 8:00–14:00 en domingo | 360 HF (no es extra porque es festivo dentro de jornada) |
| Hora extra dominical nocturna | Marca 14:00–22:00 en domingo (cruza 19:00) | 300 HF (14-19) + 180 HEFN (19-22) |
| Cruce de medianoche | Marca 22:00–04:00 en lunes | 120 RN (22-24) + 240 RN (00-04) = 360 min |
| Festivo intersemanal (San José 23-mar) | Marca 8:00–18:00 en festivo martes | 600 HF |
| Marca sin salida | Solo `hora_entrada_real` | marca con `minutos_trabajados = 0`, requiere `hora_salida_real` para calcular |

### 1.4 Reglas de la bolsa de horas

- **Crédito:** al autorizar el cálculo semanal y quedar `CONFIRMADO`, se acredita la bolsa según los conceptos configurados cuando la política efectiva está habilitada.
- **Vigencia:** cada crédito expira `bolsa_vigencia_semanas` (default 4) semanas después de la fecha de cierre del cálculo.
- **Débito:** el responsable regional puede solicitar una compensación, que se registra como `nomina_bolsa_horas_saldo.minutos_debito`. Solo se permite compensar saldo vigente.
- **Saldo inicial:** cada nuevo cálculo toma el `minutos_saldo_final` del cálculo anterior del mismo empleado.

### 1.5 Workflow de estados

#### Actualización implementada 2026-07-17

- Un empleado sin autorización HE efectiva puede programarse, precalcularse y finalizarse.
- Su cálculo se persiste como `PENDIENTE_AUTORIZACION`; conserva el costo OT proyectado y no acredita bolsa.
- `POST /calculos/{calculo_id}/autorizar`, protegido por `nomina_horas_extras.autorizar` y por alcance de empleado, realiza `PENDIENTE_AUTORIZACION -> CONFIRMADO` y acredita la bolsa una sola vez.
- La ruta genérica `/calculos/{calculo_id}/transicion` no permite confirmar un cálculo pendiente.
- Si la bolsa está deshabilitada por la política efectiva, la autorización confirma el cálculo sin crear crédito.
- Repetir la autorización de un cálculo ya confirmado es idempotente y no crea movimientos ni eventos adicionales.

Máquina vigente para `nomina_calculo_semanal.estado`:

```
PENDIENTE_AUTORIZACION ──autorizar──→ CONFIRMADO ──pagar─────→ PAGADO
                                               ├──compensar─→ COMPENSADO
                                               └──anular────→ ANULADO
```

Reglas:
- `PENDIENTE_AUTORIZACION`: cálculo finalizado sin crédito de bolsa.
- `CONFIRMADO`: cálculo autorizado; acredita bolsa si la política efectiva está habilitada.
- `PAGADO` y `COMPENSADO`: terminales.
- `ANULADO`: terminal y revierte los efectos del cálculo confirmado.

Cada transición se registra en `nomina_calculo_workflow_evento` con cálculo, estados, actor, justificación y fecha.

> **Nota de vigencia:** las referencias posteriores de este documento a `FIRMADO`, `APROBADO`, `nomina_auditoria_estado` y sus ejemplos de código corresponden a la propuesta histórica del 2026-06-01. Se conservan como antecedente no normativo; el contrato vigente de cálculos HE es exclusivamente el definido en esta sección 1.5 y en el código implementado.

---

## 2. API / Backend (FastAPI & SQLModel)

### 2.1 Modelos nuevos

Ver sección 4 del plan. Resumen:

```python
# backend_v2/app/models/novedades_nomina/horarios.py

class NominaHorarioPactado(SQLModel, table=True):
    __tablename__ = "nomina_horario_pactado"
    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(max_length=50, index=True)
    dia_semana: int  # 0=Dom, 6=Sáb
    hora_entrada: time
    hora_salida: time
    minutos_jornada: int
    vigente_desde: date
    vigente_hasta: Optional[date] = None
    observaciones: Optional[str] = None


class NominaMarcaTimelog(SQLModel, table=True):
    __tablename__ = "nomina_marca_timelog"
    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(max_length=50, index=True)
    fecha: date
    hora_entrada_real: Optional[datetime] = None
    hora_salida_real: Optional[datetime] = None
    minutos_trabajados: int = Field(default=0)
    origen: str = Field(default="MANUAL", max_length=20)  # ENUM
    latitud: Optional[Decimal] = None
    longitud: Optional[Decimal] = None
    biometria_hash: Optional[str] = None
    device_id: Optional[str] = None
    ot_cc_id: Optional[int] = None
    registrado_por: int
    created_at: Optional[datetime] = Field(default_factory=datetime.now)


class NominaNovedadRegistro(SQLModel, table=True):
    __tablename__ = "nomina_novedad_registro"
    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(max_length=50, index=True)
    fecha: date
    tipo_novedad: str = Field(max_length=10)  # ENUM
    unidad: str = Field(max_length=10)  # HORAS | DIAS
    cantidad: Decimal
    descripcion_libre: Optional[str] = None
    ot_cc_id: Optional[int] = None
    estado: str = Field(default="BORRADOR", max_length=15)
    registrado_por: int
    aprobado_por: Optional[int] = None
    pagado_en: Optional[datetime] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    calculo_semanal_id: Optional[int] = None


class NominaCalculoSemanal(SQLModel, table=True):
    __tablename__ = "nomina_calculo_semanal"
    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(max_length=50, index=True)
    anio: int
    semana_iso: int
    periodo_desde: date
    periodo_hasta: date
    minutos_ordinarios: int = Field(default=0)
    minutos_hed: int = Field(default=0)
    minutos_hen: int = Field(default=0)
    minutos_hefd: int = Field(default=0)
    minutos_hefn: int = Field(default=0)
    minutos_hf: int = Field(default=0)
    minutos_rn: int = Field(default=0)
    minutos_rf: int = Field(default=0)
    minutos_rem: int = Field(default=0)
    minutos_lic: int = Field(default=0)
    minutos_inc: int = Field(default=0)
    minutos_bolsa_credito: int = Field(default=0)
    salario_base_referencial: Optional[Decimal] = None
    jornada_legal_vigente: str = Field(max_length=10)
    recargo_dominical_pct: Decimal
    estado: str = Field(default="BORRADOR", max_length=15)
    version: int = Field(default=1)
    calculado_en: Optional[datetime] = Field(default_factory=datetime.now)
    calculado_por: int

# Contrato salario HE (2026-07-09)
# El salario base de pre-liquidación no es editable ni se acepta como fuente
# de verdad desde el cliente. El backend resuelve `salario_base_mensual` desde
# `beneficio.salario` del empleado ERP activo y `nivel_riesgo_arl` desde
# `contrato.riesgoarl`. La confirmación rechaza el payload si salario o ARL no
# coinciden con el ERP vigente. Además exige `firma_calculo`, generada por el
# backend sobre fechas, OT, importes y detalles de la pre-liquidación, para
# impedir cambios coherentemente recalculados desde el cliente.


class NominaCalculoDiarioDetalle(SQLModel, table=True):
    __tablename__ = "nomina_calculo_diario_detalle"
    id: Optional[int] = Field(default=None, primary_key=True)
    calculo_id: int = Field(foreign_key="nomina_calculo_semanal.id", index=True)
    cedula: str = Field(max_length=50, index=True)
    anio: int
    semana_iso: int
    fecha: date
    dia_semana: int  # ISO: 1=lunes, 7=domingo
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    minutos_almuerzo: int = 0
    horas_trabajadas: float = 0.0
    horas_ordinarias: float = 0.0
    horas_extras: float = 0.0
    codigo_calculado: Optional[str] = None
    horas_concepto: Optional[float] = None
    factor_hora_ordinaria: Optional[float] = None
    valor_bruto: float = 0.0
    carga_prestacional: float = 0.0
    costo_total: float = 0.0
    es_festivo: bool = False
    nombre_festivo: Optional[str] = None
    es_domingo: bool = False
    es_jornada_nocturna: bool = False
    novedad_codigo: Optional[str] = None
    novedad_evento_id: Optional[int] = None
    fuente_horario: str = "PLANIFICADOR"
    fuente_evidencia_id: Optional[int] = None
    hash_snapshot: Optional[str] = None
    creado_por: Optional[str] = None
    ot_id: Optional[int] = None
    ot_codigo: Optional[str] = None
    observaciones: Optional[str] = None
    creado_en: datetime = Field(default_factory=datetime.now)

# Contrato trazabilidad diaria HE (2026-07-09)
# Todo calculo confirmado persiste el detalle diario usado para liquidar. La
# pre-liquidacion devuelve `detalle_diario`, la confirmacion lo exige dentro de
# la misma `firma_calculo`, y el detalle del calculo retorna:
# `detalle_diario_estado`: DISPONIBLE, HISTORICO_SIN_SNAPSHOT o INCOMPLETO.


class NominaBolsaHorasSaldo(SQLModel, table=True):
    __tablename__ = "nomina_bolsa_horas_saldo"
    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(max_length=50, index=True)
    anio: int
    semana_iso: int
    minutos_saldo_inicial: int = Field(default=0)
    minutos_debito: int = Field(default=0)
    minutos_credito: int = Field(default=0)
    minutos_saldo_final: int = Field(default=0)
    vigente_hasta: date


class NominaFestivoCalendario(SQLModel, table=True):
    __tablename__ = "nomina_festivo_calendario"
    fecha: date = Field(primary_key=True)
    nombre: str = Field(max_length=100)
    fuente: str = Field(max_length=20)  # CALENDARIFIC | LEY_EMILIANI
    anio: int


class NominaParametrosLegales(SQLModel, table=True):
    __tablename__ = "nomina_parametros_legales"
    id: Optional[int] = Field(default=None, primary_key=True)
    vigencia_desde: date
    vigencia_hasta: Optional[date] = None
    jornada_semanal_h: int
    hora_ordinaria_base: Optional[Decimal] = None
    recargo_dominical_pct: Decimal
    recargo_nocturno_pct: Decimal = Field(default=Decimal("35"))
    hora_nocturna_inicio: time = Field(default=time(19, 0))
    hora_nocturna_fin: time = Field(default=time(6, 0))
    limite_he_diario_min: int = Field(default=120)
    limite_he_semanal_min: int = Field(default=720)
    bolsa_ratio_credito: Decimal = Field(default=Decimal("1.5"))
    bolsa_vigencia_semanas: int = Field(default=4)
    activo: bool = Field(default=True)
    creado_por: int
    creado_en: Optional[datetime] = Field(default_factory=datetime.now)


class NominaAuditoriaEstado(SQLModel, table=True):
    __tablename__ = "nomina_auditoria_estado"
    id: Optional[int] = Field(default=None, primary_key=True)
    tabla_origen: str = Field(max_length=100)
    registro_id: int
    estado_anterior: Optional[str] = Field(default=None, max_length=20)
    estado_nuevo: str = Field(max_length=20)
    usuario_id: int
    justificacion: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
```

### 2.2 Firmas de funciones principales

```python
# backend_v2/app/services/novedades_nomina/calculo_horas_service.py

from typing import Protocol
from datetime import date, datetime
from decimal import Decimal

class NominaMarcaTimelogProtocol(Protocol):
    cedula: str
    fecha: date
    hora_entrada_real: datetime | None
    hora_salida_real: datetime | None


class NominaHorarioPactadoProtocol(Protocol):
    dia_semana: int
    hora_entrada: time
    hora_salida: time
    minutos_jornada: int


class NominaParametrosLegalesProtocol(Protocol):
    recargo_nocturno_pct: Decimal
    recargo_dominical_pct: Decimal
    hora_nocturna_inicio: time
    hora_nocturna_fin: time
    limite_he_diario_min: int
    bolsa_ratio_credito: Decimal


def calcular_horas_extras(
    marca: NominaMarcaTimelogProtocol,
    horario_pactado: NominaHorarioPactadoProtocol,
    es_festivo: bool,
    parametros: NominaParametrosLegalesProtocol,
) -> dict[str, int]:
    """
    Función pura. Retorna dict con:
    - minutos_ordinarios, minutos_hed, minutos_hen,
      minutos_hefd, minutos_hefn, minutos_hf, minutos_rn, minutos_rf
    Lanza ValueError si la marca es inválida.
    """


def calcular_minutos_bolsa_credito(
    calculo: dict[str, int],
    parametros: NominaParametrosLegalesProtocol,
) -> int:
    """
    Retorna (minutos_hed + minutos_hen + minutos_hefd + minutos_hefn) * bolsa_ratio_credito.
    """


def validar_limites_he(
    calculo_diario: dict[str, int],
    calculo_semanal: dict[str, int],
    parametros: NominaParametrosLegalesProtocol,
) -> list[dict[str, str]]:
    """
    Retorna lista de warnings:
    [{'codigo': 'LIMITE_HE_DIARIO_EXCEDIDO', 'detalle': '...'}, ...]
    """
```

```python
# backend_v2/app/services/novedades_nomina/bolsa_horas_service.py

def calcular_saldo_semanal(
    cedula: str, anio: int, semana_iso: int, session: AsyncSession
) -> NominaBolsaHorasSaldo:
    """
    Crea o actualiza el snapshot semanal:
    saldo_inicial = saldo_final de la semana anterior
    credito = minutos_bolsa_credito del calculo semanal aprobado
    debito = compensaciones usadas
    saldo_final = inicial + credito - debito
    vigente_hasta = periodo_hasta + bolsa_vigencia_semanas
    """


def compensar_horas(
    cedula: str, minutos: int, fecha_compensacion: date, session: AsyncSession
) -> NominaBolsaHorasSaldo:
    """
    Descuenta minutos del saldo vigente. Lanza 409 si no hay saldo suficiente.
    """
```

```python
# backend_v2/app/services/novedades_nomina/workflow_service.py

TRANSICIONES_VALIDAS: dict[str, set[str]] = {
    "BORRADOR": {"FIRMADO"},
    "FIRMADO": {"APROBADO", "BORRADOR"},  # rechazo
    "APROBADO": {"PAGADO", "FIRMADO"},  # rechazo
    "PAGADO": set(),
}


def transicionar_estado(
    tabla: str,
    registro_id: int,
    estado_destino: str,
    usuario_id: int,
    justificacion: str | None,
    session: AsyncSession,
) -> None:
    """
    Valida transición. Registra en nomina_auditoria_estado. Lanza 409 si inválida.
    """
```

```python
# backend_v2/app/services/novedades_nomina/calendarific_client.py

def obtener_festivos(anio: int) -> list[dict]:
    """
    Si CALENDARIFIC_API_KEY está vacía o falla la petición,
    retorna fallback_colombia(anio) (tabla Ley Emiliani).
    Retorna lista de {fecha, nombre, fuente}.
    """
```

```python
# backend_v2/app/services/novedades_nomina/festivos_colombia.py

def fallback_colombia(anio: int) -> list[dict]:
    """
    Retorna los 18 festivos nacionales del año aplicando Ley Emiliani (Ley 51/1983).
    """
```

```python
# backend_v2/app/services/novedades_nomina/erp_empleados_service.py

def empleado_activo(cedula: str, db_erp: AsyncSession) -> dict | None:
    """
    Consulta tabla establecimiento del ERP.
    Retorna {cedula, nombre, empresa, fecha_ingreso, fecha_retiro, ...} o None.
    """
```

### 2.3 Endpoints REST

| Método | Ruta | Permiso RBAC | Descripción |
|---|---|---|---|
| GET | `/parametros-legales/vigente` | público autenticado | Retorna parámetros legales activos en la fecha actual |
| PUT | `/parametros-legales/{id}` | `nomina.parametros.admin` | Crea nueva versión (inmutabilidad) |
| GET | `/empleados/buscar?cedula=&q=` | autenticado | Lee desde ERP `establecimiento`, filtra activos |
| GET | `/horario-pactado/{cedula}` | autenticado | Lista configuración semanal del empleado |
| POST | `/horario-pactado` | `nomina.horas_extras.registro` | Upsert de horario |
| POST | `/marcas` | `nomina.horas_extras.registro` | Crea 1 o N marcas (body: lista) |
| POST | `/marcas/masivo` | `nomina.horas_extras.registro` | Upload CSV/XLSX con preview |
| GET | `/marcas?cedula=&desde=&hasta=` | autenticado | Lista marcas con filtros |
| GET | `/novedades?tipo=&cedula=&estado=` | autenticado | Lista con filtros |
| POST | `/novedades` | `nomina.novedades.registro` | Crea novedad (cualquier tipo, incluye REM/LIC/INC) |
| PATCH | `/novedades/{id}` | `nomina.novedades.registro` | Edita solo si estado=BORRADOR |
| POST | `/workflow/{tabla}/{id}/transicion` | depende del estado | Body: `{estado_destino, justificacion}` |
| GET | `/calculo/preview?cedula=&anio=&semana=` | `nomina.calculo.preview` | Calcula sin persistir |
| POST | `/calculo/confirmar` | `nomina.calculo.aprobacion` | Persiste y deja en BORRADOR |
| GET | `/calculos/planilla` | `nomina_horas_extras.leer` | Planilla diaria consolidada por empleado, fecha, CC y novedad; aplica alcance de empleados |
| GET | `/calculos/{calculo_id}` | autenticado | Detalle de un calculo confirmado; incluye `detalle_diario_estado` y `detalle_diario` si existe snapshot |
| GET | `/bolsa/{cedula}` | `nomina.bolsa.consulta` | Saldo actual y movimientos |
| POST | `/bolsa/compensar` | `nomina.calculo.aprobacion` | Registra débito |
| GET | `/festivos/{anio}?fuente=auto|calendarific|emiliani` | público autenticado | Lista festivos |

#### Contrato de la planilla de calculos

`GET /calculos/planilla` acepta `cedula`, `anio`, `semana_iso`, `estado`, `limit` y `offset`. `limit` y `offset` paginan calculos semanales; cada calculo puede producir varias filas diarias. La respuesta usa `Cache-Control: no-store, private` porque contiene identificacion y valores de nomina.

La clave funcional de consolidacion es `cedula + fecha + ot_cc + novedad`. Cuando la ubicacion es `CC`, `ot_cc` y `sub_subc` priorizan `cc` y `scc`; `orden` y `sub_indice` solo son respaldo cuando esos valores no existen. No se emiten repartos de cero horas.

El contrato contiene 23 propiedades. Las 19 columnas operativas son `cedula`, `empleado`, `salario`, `base_hora`, `aplica_he`, `empresa`, `sucursal`, `fecha`, `ot_cc`, `sub_subc`, `especialidad_ot`, `cantidad`, `ubicacion`, `novedad`, `cantidad_horas`, `observaciones`, `responsable`, `encargados` y `cliente`. `fila_id`, `calculo_id`, `costo_total` y `estado` son metadatos internos de UI.

Salario, base hora, estado y responsable se leen del calculo semanal en el estado consultado. Las horas, conceptos e importes diarios se generan desde el snapshot inmutable y se validan por hash, periodo y conciliacion contra el detalle semanal. Si el snapshot no supera la validacion, se usa el detalle semanal historico.

CC, SCC y especialidad se proyectan desde las asignaciones vigentes del planificador porque esos campos no forman parte del snapshot diario persistido. Empresa, sucursal, jefe y metadatos OT/cliente tambien son lecturas ERP vigentes. Por tanto, estos metadatos descriptivos pueden cambiar respecto del momento de confirmacion; no deben interpretarse como evidencia historica inmutable. Si ERP no esta disponible, los campos opcionales quedan vacios sin impedir la consulta.

Evidencia focal del 2026-07-21:

| Comando | Resultado |
|---|---|
| `cd backend_v2; python -m pytest ../testing/backend/test_horas_extras_calculos_planilla.py -q` | 17 passed |
| `cd backend_v2; python -m pytest ../testing/backend/test_horas_extras_ot_horarios.py -q` | 18 passed, 1 skipped; smoke ERP de produccion opt-in |
| `cd frontend; npm run test -- --run src/tests/CalculoListView.test.tsx src/tests/horasExtrasPlanillaService.test.ts` | 11 passed |
| `cd frontend; npx eslint src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView.tsx src/pages/ServicePortal/pages/HORAS_EXTRAS/calculoPlanillaColumns.tsx src/services/horasExtrasPlanillaService.ts src/types/horasExtrasPlanilla.ts src/tests/CalculoListView.test.tsx src/tests/horasExtrasPlanillaService.test.ts` | Sin hallazgos |
| `cd frontend; npm run build` | 4042 modulos transformados |
| `cd backend_v2; python -m compileall -q app/api/novedades_nomina/routers/horas_extras_consultas.py app/models/novedades_nomina/schemas_horas_extras.py app/models/novedades_nomina/schemas_horas_extras_planilla.py app/services/novedades_nomina/horas_extras_confirmacion.py app/services/novedades_nomina/horas_extras_planilla.py app/services/erp/empleados_service.py app/services/erp/ordenes_trabajo_service.py` | Sin errores |

### 2.4 Respuestas de error

| Código HTTP | Cuándo | Detalle |
|---|---|---|
| 400 | Marca inválida | "hora_salida_real debe ser posterior a hora_entrada_real" |
| 400 | Horario no definido | "No hay horario pactado para {cedula} el {fecha}" |
| 400 | Cálculo no balancea | "Suma de minutos por concepto no coincide con minutos trabajados" |
| 404 | Cédula no existe en ERP | "Empleado {cedula} no encontrado en establecimiento" |
| 409 | Transición inválida | "No se puede pasar de FIRMADO a BORRADOR sin justificación de rechazo" |
| 409 | Sin saldo en bolsa | "Saldo insuficiente: disponible {min} min, solicitado {min} min" |
| 422 | Parámetros incompletos | validación Pydantic estándar |

---

## 3. Frontend (React & TypeScript)

### 3.1 Rutas nuevas (en `frontend/src/components/Router.tsx`)

Las páginas del portal se anidan bajo `/service-portal/*`. La navegación a la nueva sección sigue el patrón de las planillas:

```tsx
<Route path="novedades-nomina/horas-extras" element={<RegistroHorasExtras />}>
  <Route index element={<Navigate to="individual" replace />} />
  <Route path="individual" element={<RegistroIndividual />} />
  <Route path="masivo" element={<RegistroMasivo />} />
  <Route path="calendario" element={<GestionCalendario />} />
</Route>

<Route path="novedades-nomina/registro" element={<NovedadesGenerales />}>
  <Route index element={<ListadoNovedades />} />
  <Route path="nueva" element={<FormularioNovedad />} />
  <Route path=":id" element={<FormularioNovedad />} />
</Route>

<Route path="novedades-nomina/calculo" element={<CalculoSemanal />}>
  <Route index element={<PreviewCalculo />} />
  <Route path="confirmar/:cedula/:anio/:semana" element={<ConfirmarCalculo />} />
</Route>

<Route path="novedades-nomina/bolsa" element={<BolsaHoras />}>
  <Route index element={<ResumenBolsa />} />
  <Route path="compensar" element={<CompensarHoras />} />
</Route>

<Route path="novedades-nomina/parametros" element={<ConfiguracionParametros />} />
```

### 3.2 Componentes del design system a usar (sin HTML crudo ni Tailwind ad-hoc)

| Componente | Ubicación | Uso |
|---|---|---|
| `MaterialCard` | `components/atoms/MaterialCard.tsx` | Contenedor de tarjetas de sección |
| `DataTable` | `components/molecules/DataTable.tsx` | Tabla de marcas, novedades, cálculos |
| `ColumnFilterPopover` | `components/molecules/ColumnFilterPopover.tsx` | Filtros tipo Excel por columna |
| `FilePicker` | `components/molecules/FilePicker.tsx` | Carga masiva CSV/XLSX |
| `SubcategorySummaryCard` | `pages/.../components/SubcategorySummaryCard.tsx` | Resumen por empleado |
| `Callout` | `components/molecules/Callout.tsx` | Warnings (exceso de límites, fallback Calendarific) |
| `Button`, `Input`, `Select`, `Textarea`, `Badge`, `Spinner` | `components/atoms/` | Átomos base |
| `MaterialTypography`, `Title`, `Text` | `components/atoms/` | Tipografía consistente |
| `useNotifications` | `components/notifications/NotificationsContext.tsx` | Toasts de éxito/error |

### 3.3 Componentes nuevos

```tsx
// frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/components/TimePickerDual.tsx
interface TimePickerDualProps {
  horaEntrada: string;        // "HH:MM"
  horaSalida: string;         // "HH:MM"
  onChange: (e: string, s: string) => void;
  jornadaPactada?: { entrada: string; salida: string };
}
// Valida que salida > entrada. Muestra advertencia si la marca cubre horario nocturno.
```

```tsx
// frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/components/HorarioSemanalEditor.tsx
interface HorarioSemanalEditorProps {
  cedula: string;
  horario: Record<number, { entrada: string; salida: string; minutos: number } | null>;
  onChange: (nuevo: Record<number, ...>) => void;
  onGuardar: () => Promise<void>;
}
// Grid 7×2 (lun-dom). Carga desde /horario-pactado/{cedula}. POST al guardar.
```

```tsx
// frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/components/ConceptoNovedadSelect.tsx
interface ConceptoNovedadSelectProps {
  value: string;
  onChange: (v: string) => void;
}
// Selector que adapta la unidad (HORAS/DIAS) según el tipo elegido.
// Muestra descripción legal de cada uno en el dropdown.
```

```tsx
// frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/components/WorkflowBadge.tsx
interface WorkflowBadgeProps { estado: 'BORRADOR'|'FIRMADO'|'APROBADO'|'PAGADO'; }
// Badge con color: gris/azul/verde/verde-oscuro. Muestra tooltip con la descripción del estado.
```

```tsx
// frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/components/WorkflowTimeline.tsx
interface WorkflowTimelineProps {
  estados: Array<{ estado: string; fecha: string; usuario: string; justificacion?: string }>;
}
// Visualiza las 4 etapas. Click en una etapa muestra los detalles de la transición.
```

```tsx
// frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/components/SoporteTextoLibre.tsx
interface SoporteTextoLibreProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}
// Textarea con contador de caracteres. NO usa FilePicker ni endpoint de upload.
```

```tsx
// frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/components/CalendarificStatusBadge.tsx
interface CalendarificStatusBadgeProps {
  fuente: 'CALENDARIFIC' | 'LEY_EMILIANI';
  keyConfigured: boolean;
}
// Muestra de dónde vino el festivo. Si fuente=LEY_EMILIANI y keyConfigured=true,
// muestra Callout amarillo recomendando revisar la API.
```

```tsx
// frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/components/BolsaHorasCard.tsx
interface BolsaHorasCardProps {
  cedula: string;
  nombre: string;
  saldoMinutos: number;
  creditoSemana: number;
  debitoSemana: number;
  vigenteHasta: string;
}
// Tarjeta visual: barra de progreso con minutos usados vs disponibles, fecha de expiración.
```

### 3.4 Servicios (axios)

```ts
// frontend/src/services/horasExtrasService.ts
export const horasExtrasService = {
  // Parametros
  getParametrosVigentes: () => axios.get(`${BASE}/parametros-legales/vigente`),

  // Empleados
  buscarEmpleados: (q: string) => axios.get(`${BASE}/empleados/buscar`, { params: { q } }),

  // Horario
  getHorario: (cedula: string) => axios.get(`${BASE}/horario-pactado/${cedula}`),
  upsertHorario: (data: HorarioPactadoDTO) => axios.post(`${BASE}/horario-pactado`, data),

  // Marcas
  crearMarcas: (marcas: MarcaDTO[]) => axios.post(`${BASE}/marcas`, { marcas }),
  cargarMasivo: (file: File, periodo: { mes: number; anio: number }) => {
    const fd = new FormData();
    fd.append('file', file);
    return axios.post(`${BASE}/marcas/masivo`, fd, { params: periodo });
  },
  listarMarcas: (filtros: MarcasFiltro) => axios.get(`${BASE}/marcas`, { params: filtros }),

  // Novedades
  listarNovedades: (filtros: NovedadesFiltro) => axios.get(`${BASE}/novedades`, { params: filtros }),
  crearNovedad: (n: NovedadDTO) => axios.post(`${BASE}/novedades`, n),
  editarNovedad: (id: number, n: Partial<NovedadDTO>) => axios.patch(`${BASE}/novedades/${id}`, n),

  // Workflow
  transicionar: (tabla: string, id: number, body: { estado_destino: string; justificacion?: string }) =>
    axios.post(`${BASE}/workflow/${tabla}/${id}/transicion`, body),

  // Cálculo
  previewCalculo: (cedula: string, anio: number, semana: number) =>
    axios.get(`${BASE}/calculo/preview`, { params: { cedula, anio, semana } }),
  confirmarCalculo: (body: ConfirmarCalculoDTO) => axios.post(`${BASE}/calculo/confirmar`, body),
  getCalculo: (calculoId: number) => axios.get(`${BASE}/calculos/${calculoId}`),

  // Bolsa
  getBolsa: (cedula: string) => axios.get(`${BASE}/bolsa/${cedula}`),
  compensar: (body: CompensarDTO) => axios.post(`${BASE}/bolsa/compensar`, body),

  // Festivos
  getFestivos: (anio: number, fuente: 'auto'|'calendarific'|'emiliani' = 'auto') =>
    axios.get(`${BASE}/festivos/${anio}`, { params: { fuente } }),
};
```

### 3.5 Tipos TypeScript

```ts
// frontend/src/types/horasExtras.ts
export type EstadoWorkflow = 'BORRADOR' | 'FIRMADO' | 'APROBADO' | 'PAGADO';
export type TipoNovedad = 'HED'|'HEN'|'HEFD'|'HEFN'|'HF'|'RN'|'RF'|'REM'|'LIC'|'INC'|'VAC'|'PNR'|'RET'|'CMP'|'ARL'|'AUS'|'SAN'|'DXT'|'SALARIO';
export type Unidad = 'HORAS' | 'DIAS';
export type OrigenMarca = 'MANUAL'|'MASIVO'|'BIOMETRICO_APP'|'RFID'|'QR';

export interface HorarioPactadoDTO {
  cedula: string;
  items: Array<{
    dia_semana: number;
    hora_entrada: string; // "HH:MM"
    hora_salida: string;
    minutos_jornada: number;
  }>;
}

export interface MarcaDTO {
  cedula: string;
  fecha: string;        // "YYYY-MM-DD"
  hora_entrada_real: string | null;  // ISO datetime
  hora_salida_real: string | null;
  ot_cc_id?: number;
}

export interface NovedadDTO {
  cedula: string;
  fecha: string;
  tipo_novedad: TipoNovedad;
  unidad: Unidad;
  cantidad: number;
  descripcion_libre?: string;
  ot_cc_id?: number;
}

export interface ResultadoCalculoSemanal {
  cedula: string;
  anio: number;
  semana_iso: number;
  periodo_desde: string;
  periodo_hasta: string;
  minutos_ordinarios: number;
  minutos_hed: number;
  minutos_hen: number;
  minutos_hefd: number;
  minutos_hefn: number;
  minutos_hf: number;
  minutos_rn: number;
  minutos_rf: number;
  minutos_rem: number;
  minutos_lic: number;
  minutos_inc: number;
  minutos_bolsa_credito: number;
  jornada_legal_vigente: '44h' | '42h';
  recargo_dominical_pct: number;
  warnings: Array<{ codigo: string; detalle: string }>;
  detalle_diario_estado?: 'DISPONIBLE' | 'HISTORICO_SIN_SNAPSHOT' | 'INCOMPLETO';
  detalle_diario?: CalculoDiarioDetalle[];
}

export interface CalculoDiarioDetalle {
  fecha: string;
  dia_semana: number;
  hora_entrada?: string | null;
  hora_salida?: string | null;
  minutos_almuerzo: number;
  horas_trabajadas: number;
  horas_ordinarias: number;
  horas_extras: number;
  codigo_calculado?: TipoNovedad | string | null;
  horas_concepto?: number | null;
  factor_hora_ordinaria?: number | null;
  valor_bruto: number;
  carga_prestacional: number;
  costo_total: number;
  es_festivo: boolean;
  nombre_festivo?: string | null;
  es_domingo: boolean;
  es_jornada_nocturna: boolean;
  fuente_horario: string;
}
```

### 3.6 Comportamiento responsive (mobile-first)

- Vista < 768 px: el grid de empleados (DataTable) colapsa a una lista vertical con tarjetas MaterialCard. El TimePickerDual ocupa todo el ancho.
- Vista ≥ 768 px: DataTable con scroll horizontal virtualizado si la lista supera 100 filas.
- Vista ≥ 1024 px: el formulario de horario semanal muestra los 7 días en una sola fila; debajo del lg se reorganiza en 2 filas (lun-mié-vie / mar-jue-sáb-dom).

---

## 4. Plan de Pruebas (TDD)

### 4.1 Pruebas unitarias del motor puro (`test_calculo_horas_puro.py`)

Se crean **primero** los tests, se verifica que fallen, y luego se implementa el motor. Cada caso borde del punto 1.3 debe tener su test.

```python
# testing/backend/test_calculo_horas_puro.py
import pytest
from decimal import Decimal
from datetime import date, time, datetime
from backend_v2.app.services.novedades_nomina.calculo_horas_service import calcular_horas_extras
from backend_v2.app.services.novedades_nomina.catalogo_conceptos import ParametrosLegalesDummy, HorarioDummy, MarcaDummy

@pytest.fixture
def parametros_2026_ene_jun() -> ParametrosLegalesDummy:
    return ParametrosLegalesDummy(
        recargo_nocturno_pct=Decimal("35"),
        recargo_dominical_pct=Decimal("80"),
        hora_nocturna_inicio=time(19, 0),
        hora_nocturna_fin=time(6, 0),
        limite_he_diario_min=120,
        bolsa_ratio_credito=Decimal("1.5"),
    )


def test_marca_completa_en_jornada_diurna(parametros_2026_ene_jun):
    """7:00-15:00 lunes no festivo: 480 min ordinarios, 0 HE."""
    marca = MarcaDummy(fecha=date(2026, 3, 9), entrada=datetime(2026,3,9,7,0), salida=datetime(2026,3,9,15,0))
    horario = HorarioDummy(dia_semana=0, hora_entrada=time(7,0), hora_salida=time(15,0), minutos_jornada=480)
    resultado = calcular_horas_extras(marca, horario, es_festivo=False, parametros=parametros_2026_ene_jun)
    assert resultado["minutos_ordinarios"] == 480
    assert resultado["minutos_hed"] == 0
    assert resultado["minutos_hen"] == 0
    # ... resto de claves en cero


def test_hora_extra_diurna_2h(parametros_2026_ene_jun):
    """Jornada 7-15, marca 7-17: 480 ord + 120 HED."""
    ...


def test_hora_extra_nocturna_2h(parametros_2026_ene_jun):
    """Jornada 7-15, marca 7-20: 480 ord + 120 HED + 60 HEN."""
    ...


def test_marca_dominical_diurna(parametros_2026_ene_jun):
    """Marca 8-14 en domingo: 360 HF (no es extra, es jornada)."""
    ...


def test_marca_festiva_con_he(parametros_2026_ene_jun):
    """San José 23-mar (martes festivo), marca 7-19: 480 HF + 120 HEFD."""
    ...


def test_cruce_de_medianoche(parametros_2026_ene_jun):
    """Marca 22:00-04:00 lunes: 120 RN + 240 RN = 360 RN total."""
    ...


def test_jornada_nocturna_pactada(parametros_2026_ene_jun):
    """Jornada 19-03 (nocturna), marca 19-03: 480 RN."""
    ...


def test_limite_he_diario_excedido_warning(parametros_2026_ene_jun):
    """Marca con 4h extras debe generar warning pero no bloquear."""
    from backend_v2.app.services.novedades_nomina.calculo_horas_service import validar_limites_he
    calculo = {"minutos_hed": 240, "minutos_hen": 0, "minutos_hefd": 0, "minutos_hefn": 0,
               "minutos_hf": 0, "minutos_rn": 0, "minutos_rf": 0, "minutos_ordinarios": 480}
    warnings = validar_limites_he(calculo, calculo, parametros_2026_ene_jun)
    assert any(w["codigo"] == "LIMITE_HE_DIARIO_EXCEDIDO" for w in warnings)
```

### 4.2 Pruebas de la bolsa (`test_bolsa_horas.py`)

- `test_credito_por_he_aprobada`: cálculo aprobado acredita `(HED+HEN+HEFD+HEFN) × 1.5` minutos.
- `test_vencimiento_4_semanas`: después de 4 semanas, el saldo caduca.
- `test_compensar_con_saldo`: descuento de 60 min sobre saldo de 120 min → ok.
- `test_compensar_sin_saldo`: 409 con mensaje claro.
- `test_arrastre_saldo_inicial`: nueva semana parte del saldo final anterior.

### 4.3 Pruebas del workflow (`test_workflow_estados.py`)

- `test_transicion_valida_borrador_a_firmado`
- `test_transicion_invalida_borrador_a_aprobado` (debe pasar por FIRMADO)
- `test_rechazo_firmado_a_borrador_requiere_justificacion`
- `test_pagado_terminal`
- `test_auditoria_registra_cada_transicion`

### 4.4 Pruebas de la API (`test_horas_extras_api.py`)

- `test_post_marca_crea_registro`
- `test_post_marca_cedula_inactiva_retorna_404`
- `test_get_horario_pactado_por_cedula`
- `test_workflow_endpoint_respeta_permisos`
- `test_calculo_preview_no_persiste`
- `test_calculo_confirmar_persiste_en_borrador`
- `test_festivos_retorna_lista_18_items_anio_2026`

### 4.5 Pruebas de Calendarific fallback (`test_calendarific_fallback.py`)

- `test_key_vacia_usa_emiliani`
- `test_api_caida_usa_emiliani` (mock con timeout/500)
- `test_api_exitosa_usa_calendarific`
- `test_tabla_emiliani_contiene_18_festivos_2026`
- `test_tabla_emiliani_aplica_traslado_a_lunes` (Ley 51/1983)

### 4.6 Pruebas de novedades (`test_novedades_registro.py`)

- `test_crear_novedad_rem_con_descripcion_libre`
- `test_crear_novedad_lic_con_descripcion_libre`
- `test_crear_novedad_inc_con_descripcion_libre`
- `test_no_se_puede_crear_con_upload` (no existe endpoint de upload, no se rompe)
- `test_unidad_horas_para_he_dias_para_inc`

### 4.7 Pruebas de parámetros (`test_parametros_legales.py`)

- `test_parametros_vigentes_retorna_ultimo_vigente`
- `test_editar_parametros_crea_nueva_version`
- `test_registros_pasados_no_se_recalculan_al_cambiar_parametros`

### 4.8 Pruebas de horario (`test_horario_pactado_semanal.py`)

- `test_upsert_horario_lun_a_vie`
- `test_horario_con_jornada_fin_de_semana`
- `test_cambio_jornada_en_mitad_de_periodo`
- `test_horario_vigente_segun_fecha`

### 4.9 Pruebas de frontend

- Componentes con Vitest + React Testing Library
- `TimePickerDual.test.tsx`: valida entrada > salida
- `ConceptoNovedadSelect.test.tsx`: cambia unidad según tipo
- `WorkflowBadge.test.tsx`: 4 estados, 4 colores
- `BolsaHorasCard.test.tsx`: renderiza saldo, fecha, formato
- E2E con Playwright: flujo regional → firma → aprobación → pago

---

## 5. Próximos pasos (gated gates)

1. **Aprobación de esta spec** por el usuario.
2. **Aprobación del `implementation_plan.md`** (siguiente artefacto del flujo RIPER).
3. **Inicio de S0** (migración Alembic + seeds + RBAC).
