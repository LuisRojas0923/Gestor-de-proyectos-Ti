# Guía para LLM: Creación Asistida de Proyectos y Actividades

## Propósito

Este documento describe cómo un LLM debe guiar a un usuario para crear un **Desarrollo** (proyecto) y su desglose de **Actividades** (WBS) dentro del sistema Gestor de Proyectos TI. El LLM actúa como facilitador conversacional: hace preguntas en lenguaje natural, mapea las respuestas al modelo de datos, y ejecuta las llamadas a la API.

---

## Modelo de datos relevante

### Desarrollo (proyecto raíz)

| Campo API | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | string (≤50) | ✅ | Código único del proyecto. Ej: `DEV-2025-001` |
| `nombre` | string (≤255) | ✅ | Nombre descriptivo del proyecto |
| `descripcion` | string | — | Contexto ampliado del proyecto |
| `tipo` | string | — | Tipo: `Proyecto`, `Mejora`, `Soporte`, `Renovación`, `Actividad frecuente`, `Actividad` |
| `modulo` | string (≤100) | — | Proceso o código de módulo afectado |
| `area_desarrollo` | string (≤100) | — | Área de impacto (ej: Logística, RRHH) |
| `analista` | string | — | Nombre del líder de actividad |
| `responsable` | string | — | Nombre del responsable |
| `autoridad` | string | — | Nombre de la autoridad aprobadora |
| `fecha_inicio` | date (YYYY-MM-DD) | — | Fecha de inicio |
| `fecha_estimada_fin` | date (YYYY-MM-DD) | — | Fecha estimada de cierre |
| `estado_general` | string | auto | Siempre `"Pendiente"` al crear |
| `porcentaje_progreso` | decimal | auto | Siempre `0.0` al crear |

**Endpoint:** `POST /api/v2/desarrollos/`

---

### Actividad (nodo WBS)

| Campo API | Tipo | Requerido | Descripción |
|---|---|---|---|
| `desarrollo_id` | string | ✅ | ID del proyecto padre |
| `titulo` | string (≤255) | ✅ | Título de la tarea |
| `parent_id` | int | — | ID de actividad padre (para sub-tareas) |
| `descripcion` | string | — | Detalle de la tarea |
| `estado` | string | — | `Pendiente`, `En Progreso`, `Bloqueado`, `Completada` |
| `responsable_id` | string | — | ID del responsable (de jerarquía) |
| `asignado_a_id` | string | — | ID del ejecutor (de jerarquía) |
| `fecha_inicio_estimada` | date | — | Inicio estimado |
| `fecha_fin_estimada` | date | — | Fin estimado |
| `horas_estimadas` | decimal | — | Estimado en horas |
| `seguimiento` | string | — | Notas de seguimiento |
| `compromiso` | string | — | Compromisos definidos |
| `archivo_url` | string | — | Enlace a evidencia o documento |

**Endpoint:** `POST /api/v2/actividades/`  
La API recalcula automáticamente el `porcentaje_progreso` del proyecto al crear actividades.

---

## Flujo conversacional recomendado

### FASE 1 — Información del proyecto

El LLM debe hacer estas preguntas **una a una** o en grupos lógicos, adaptando el lenguaje al usuario:

```
1. "¿Cuál es el nombre del proyecto o iniciativa?"
   → nombre

2. "¿De qué tipo es? (Proyecto, Mejora, Soporte, Renovación, Actividad frecuente)"
   → tipo  [ofrecer lista si el usuario no sabe]

3. "¿Puedes darme una descripción breve de qué se va a hacer y por qué?"
   → descripcion

4. "¿Qué área o proceso impacta? (ej: Logística, Contabilidad, RRHH, TI)"
   → area_desarrollo

5. "¿Tienes fechas estimadas? ¿Cuándo inicia y cuándo debería terminar?"
   → fecha_inicio, fecha_estimada_fin

6. "¿Quién será el líder técnico o analista del proyecto?"
   → analista  [buscar en jerarquía si el LLM tiene acceso]

7. "¿Quién es el responsable que responde por el proyecto?"
   → responsable

8. "¿Hay una autoridad o aprobador sobre este proyecto?"
   → autoridad
```

> **Tip:** Si el usuario responde "no sé" o "más adelante", omitir el campo (son opcionales). Nunca bloquear la creación por campos opcionales.

---

### FASE 2 — Confirmación antes de crear

Antes de llamar la API, presentar un resumen para confirmación:

```
Voy a crear el siguiente proyecto:

📋 Proyecto:   [nombre]
🏷️  Tipo:       [tipo]
📝 Descripción: [descripcion]
📍 Área:        [area_desarrollo]
📅 Fechas:      [fecha_inicio] → [fecha_estimada_fin]
👤 Líder:       [analista]
👤 Responsable: [responsable]
👤 Autoridad:   [autoridad]

¿Confirmas la creación? (sí / ajustar)
```

---

### FASE 3 — Creación del proyecto

Al confirmar, ejecutar:

```http
POST /api/v2/desarrollos/
Authorization: Bearer {token}
Content-Type: application/json

{
  "id": "DEV-{timestamp-corto}",
  "nombre": "{nombre}",
  "descripcion": "{descripcion}",
  "tipo": "{tipo}",
  "area_desarrollo": "{area_desarrollo}",
  "analista": "{analista}",
  "responsable": "{responsable}",
  "autoridad": "{autoridad}",
  "fecha_inicio": "{YYYY-MM-DD}",
  "fecha_estimada_fin": "{YYYY-MM-DD}",
  "estado_general": "Pendiente",
  "porcentaje_progreso": 0.0
}
```

Guardar el `id` devuelto para usarlo como `desarrollo_id` en las actividades.

---

### FASE 4 — Definición de actividades (WBS)

Tras crear el proyecto, preguntar:

```
"¿Quieres que te ayude a definir las actividades o tareas del proyecto?
Puedes describirlas como una lista o contarme cómo fluye el trabajo."
```

**Estrategia de extracción:** El LLM debe identificar en el texto del usuario:

| Señal lingüística | Campo a poblar |
|---|---|
| Verbos de acción ("hacer", "revisar", "entregar") | `titulo` de la actividad |
| Dependencias ("primero", "después", "una vez que") | `parent_id` o secuencia lógica |
| Personas mencionadas ("lo hará Juan", "responsable: María") | `asignado_a_id` / `responsable_id` |
| Plazos ("en 2 semanas", "para el viernes 20") | `fecha_fin_estimada` |
| Estimaciones de esfuerzo ("unas 8 horas", "medio día") | `horas_estimadas` |

**Ejemplo de entrada del usuario:**
> "Primero hay que levantar los requerimientos con el cliente, luego diseñar la solución, y por último desarrollarla y hacer pruebas antes de salir a producción."

**Mapeo sugerido:**

| # | `titulo` | `parent_id` |
|---|---|---|
| 1 | Levantamiento de requerimientos | null |
| 2 | Diseño de solución | null |
| 3 | Desarrollo | null |
| 4 | Pruebas | null |
| 5 | Salida a producción | null |

---

### FASE 5 — Confirmación y creación de actividades

Presentar la lista para revisión:

```
Estas son las actividades que voy a crear:

  1. Levantamiento de requerimientos
  2. Diseño de solución
  3. Desarrollo
  4. Pruebas
  5. Salida a producción

¿Las agrego así, quieres ajustar alguna, o añadir sub-tareas?
```

Si el usuario acepta, crear cada actividad secuencialmente:

```http
POST /api/v2/actividades/
{
  "desarrollo_id": "{id_proyecto}",
  "titulo": "Levantamiento de requerimientos",
  "estado": "Pendiente"
}
```

Para sub-tareas, usar el `id` retornado de la actividad padre:

```http
POST /api/v2/actividades/
{
  "desarrollo_id": "{id_proyecto}",
  "parent_id": {id_actividad_padre},
  "titulo": "Entrevista con stakeholders",
  "estado": "Pendiente"
}
```

---

## Reglas y restricciones para el LLM

### Validaciones obligatorias

1. `id` del proyecto debe ser único en el sistema. Sugerir formato `DEV-{AAAA}-{NNN}` o `DEV-{timestamp}`.
2. `nombre` del proyecto es obligatorio — no crear sin él.
3. `titulo` de actividad es obligatorio — no crear sin él.
4. `desarrollo_id` debe corresponder a un proyecto existente.
5. Fechas siempre en formato `YYYY-MM-DD`.
6. `tipo` debe ser exactamente uno de: `Proyecto`, `Mejora`, `Soporte`, `Renovación`, `Actividad frecuente`, `Actividad`.

### Comportamiento ante incertidumbre

| Situación | Acción del LLM |
|---|---|
| Campo opcional desconocido | Omitir el campo (no enviar `null`) |
| Fecha ambigua ("la próxima semana") | Confirmar la fecha exacta antes de continuar |
| Persona nombrada como responsable | Buscar en `GET /api/v2/jerarquia/usuarios-disponibles` y usar `id` |
| Persona no encontrada en jerarquía | Guardar el nombre como texto en el campo string |
| Usuario duda del tipo de proyecto | Ofrecer descripción de cada tipo para que decida |
| Error 409 al crear proyecto (id duplicado) | Generar un nuevo `id` con timestamp y reintentar |

### Jerarquía de actividades

- El sistema soporta N niveles de profundidad mediante `parent_id` autorreferencial.
- El backend recalcula automáticamente el porcentaje del padre al crear hijos.
- Al eliminar una actividad padre, se eliminan en cascada todos sus descendientes.
- Crear primero la actividad padre; usar el `id` retornado para las sub-actividades.

### Estados válidos para actividades

| Estado | Cuándo usarlo al crear |
|---|---|
| `Pendiente` | Tarea no iniciada — default recomendado al crear |
| `En Progreso` | Solo si la tarea ya inició antes de registrarla |
| `Bloqueado` | Solo si hay impedimento conocido desde el inicio |
| `Completada` | Registrar tareas ya terminadas — activa recálculo de progreso |

---

## Ejemplo de conversación completa

```
👤 Usuario: Necesito crear un proyecto para migrar el servidor de base de datos.

🤖 LLM: Perfecto. ¿Es una migración de infraestructura completa o solo una
        actualización de versión?

👤 Usuario: Es una migración completa a un nuevo servidor físico.

🤖 LLM: ¿Qué tipo de proyecto clasificarías esto?
        1. Proyecto  2. Mejora  3. Soporte  4. Renovación

👤 Usuario: Renovación.

🤖 LLM: ¿Qué área o proceso se ve afectado?

👤 Usuario: Toda el área de TI y los sistemas de logística.

🤖 LLM: ¿Tienes fechas estimadas de inicio y cierre?

👤 Usuario: Iniciamos el 15 de enero y debería estar listo para el 28 de febrero.

🤖 LLM: ¿Quién liderará técnicamente la migración?

👤 Usuario: Lo hará PEREZ MARIN GERSON.

🤖 LLM: Voy a crear el siguiente proyecto:

        📋 Proyecto:   Migración servidor de base de datos
        🏷️  Tipo:       Renovación
        📍 Área:        TI / Logística
        📅 Fechas:      2025-01-15 → 2025-02-28
        👤 Líder:       PEREZ MARIN GERSON

        ¿Confirmas?

👤 Usuario: Sí, y agrega estas actividades:
            - Inventario del servidor actual
            - Preparación del nuevo servidor
            - Migración de datos
            - Pruebas de conectividad
            - Puesta en marcha

🤖 LLM: [POST /api/v2/desarrollos/ → id: "DEV-2025-001"]
        [POST /api/v2/actividades/ × 5 con desarrollo_id: "DEV-2025-001"]

        ✅ Proyecto creado: DEV-2025-001
        ✅ 5 actividades creadas.

        El proyecto "Migración servidor de base de datos" ya está disponible
        en /service-portal/desarrollos. Puedes acceder para asignar
        responsables por actividad y hacer seguimiento de avance.
```

---

## Endpoints de referencia

| Acción | Método | URL |
|---|---|---|
| Crear proyecto | POST | `/api/v2/desarrollos/` |
| Listar proyectos | GET | `/api/v2/desarrollos/` |
| Ver proyecto | GET | `/api/v2/desarrollos/{id}` |
| Crear actividad | POST | `/api/v2/actividades/` |
| Listar actividades del proyecto | GET | `/api/v2/actividades/?desarrollo_id={id}` |
| Actualizar actividad | PATCH | `/api/v2/actividades/{id}` |
| Eliminar actividad | DELETE | `/api/v2/actividades/{id}` |
| Previsualizar eliminación en cascada | GET | `/api/v2/actividades/{id}/preview` |
| Usuarios disponibles en jerarquía | GET | `/api/v2/jerarquia/usuarios-disponibles` |
| Tipos de proyecto activos | GET | `/api/v2/desarrollos/tipos` |
| Plantillas WBS disponibles | GET | `/api/v2/desarrollos/plantillas/` |

---

## Notas de implementación

- **Mantener contexto de sesión:** El LLM debe recordar el `id` del proyecto creado durante toda la sesión para usarlo en cada `POST /actividades/`.
- **IDs de usuario:** `responsable_id` y `asignado_a_id` esperan IDs del sistema en formato `USR-P-{cedula}`. Si no se puede resolver la persona, omitir estos campos; el usuario puede asignarlos desde la UI en `/service-portal/desarrollos/{id}`.
- **Recálculo automático:** El backend calcula `porcentaje_progreso` del proyecto como `(actividades completadas / total actividades) × 100`. No calcular manualmente.
- **Plantillas WBS:** Si el usuario no sabe cómo estructurar las actividades, ofrecer las plantillas existentes (`GET /api/v2/desarrollos/plantillas/`) como punto de partida en lugar de crear actividades desde cero.
- **Orden de creación:** Crear siempre el proyecto antes de las actividades. Crear las actividades padre antes que sus hijos.
