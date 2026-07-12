# Jerarquía de Componentes UI

### Página "Mis Desarrollos" (`MyDevelopments.tsx`)

```
MyDevelopments (Componente Principal)
├── Header Section
│   ├── Título: "Mis Desarrollos"
│   ├── Indicador de Panel Abierto (condicional)
│   └── Botón "Importar Excel"
│
├── Filtros Section
│   ├── Barra de Búsqueda (por ID o nombre)
│   ├── Filtro por Proveedor (dropdown)
│   └── Filtro por Estado (dropdown)
│
├── Tabla de Desarrollos (Vista Desktop > 1024px)
│   ├── Headers: [No. Solicitud, Nombre, Proveedor, Responsable, Estado, Progreso, Acciones]
│   └── Filas de Datos
│       ├── Botón Ver Detalles (ícono ojo) → Abre Side Panel
│       └── Botón Editar (ícono lápiz) → Abre Modal de Edición
│
├── Vista de Tarjetas (Vista Mobile/Tablet < 1024px)
│   └── Cards Individuales por Desarrollo
│       ├── Información Principal
│       ├── Detalles en Grid (Responsable, Proveedor)
│       └── Acciones (Ver/Editar)
│
├── Side Panel - "Centro de Control" (Condicional: isViewPanelOpen)
│   ├── Header
│   │   ├── Título: "Centro de Control - {ID}"
│   │   └── Botón Cerrar (X)
│   ├── Información Principal
│   │   ├── ID del Desarrollo
│   │   └── Nombre del Desarrollo
│   ├── Grid de Detalles Clave
│   │   ├── Estado
│   │   ├── Progreso
│   │   ├── Proveedor
│   │   └── Responsable
│   ├── Sección Cronograma de Hitos
│   │   └── Placeholder para Gantt Chart
│   ├── Controles de Calidad (Dinámicos por Etapa)
│   │   ├── Título con nombre de etapa actual
│   │   └── Lista de Controles (checkboxes + descripciones)
│   │       ├── C003-GT (Etapas 1-2)
│   │       ├── C021-GT (Etapas 5-7)
│   │       ├── C004-GT (Etapas 8-10)
│   │       └── C027-GT (Etapas 8-10)
│   └── Bitácora de Actividades
│       ├── Formulario de Nueva Actividad
│       │   ├── Textarea para descripción
│       │   └── Botón "Registrar Actividad"
│       └── Lista de Actividades (orden cronológico inverso)
│
├── Modal de Edición (Condicional: isEditModalOpen)
│   ├── Header con título y botón cerrar
│   ├── Formulario en Grid
│   │   ├── No. Solicitud (deshabilitado)
│   │   ├── Nombre del Desarrollo
│   │   ├── Estado General (dropdown)
│   │   └── Etapa del Progreso (dropdown con optgroups)
│   │       ├── "EN EJECUCIÓN" (Definición, Análisis, Desarrollo, etc.)
│   │       ├── "EN ESPERA" (Propuesta, Aprobación, etc.)
│   │       └── "FINALES/OTROS" (Desplegado, Cancelado)
│   └── Botones de Acción (Cancelar, Guardar)
│
└── Modal de Importación (Condicional: isImportModalOpen)
    ├── Header con título y botón cerrar
    └── Componente ExcelImporter
        ├── Zona de arrastrar archivo
        ├── Vista previa de datos
        ├── Mapeo de columnas
        └── Botones de confirmación
```

### Estados y Variables de Control

```
Estados Principales:
├── developments: Development[] - Lista principal de desarrollos
├── selectedDevelopment: Development | null - Desarrollo seleccionado
├── isViewPanelOpen: boolean - Control del Side Panel
├── isEditModalOpen: boolean - Control del Modal de Edición
├── isImportModalOpen: boolean - Control del Modal de Importación
├── editingDevelopment: Development | null - Copia para edición
└── newActivity: string - Texto de nueva actividad

Estados de Filtros:
├── searchTerm: string - Término de búsqueda
├── providerFilter: string - Filtro por proveedor
└── statusFilter: string - Filtro por estado

Datos Calculados (useMemo):
└── filteredDevelopments - Lista filtrada según criterios
```

### Funciones de Manejo de Eventos

```
Navegación y Visualización:
├── handleViewDetails(dev) → Abre Side Panel
├── handleEdit(dev) → Abre Modal de Edición
├── handleCloseModal() → Cierra Modal de Edición
└── setViewPanelOpen(false) → Cierra Side Panel

Gestión de Datos:
├── loadDevelopments() → Carga desde API/localStorage
├── handleImport(data) → Procesa importación de Excel
├── handleAddActivity() → Agrega actividad a bitácora
└── handleFormChange(e) → Actualiza formulario de edición

Filtros:
├── setSearchTerm(value) → Actualiza búsqueda
├── setProviderFilter(value) → Actualiza filtro proveedor
└── setStatusFilter(value) → Actualiza filtro estado
```

### Configuraciones y Constantes

```
Mapeo de Datos:
└── columnMapping - Mapeo Excel → Modelo de datos

Etapas del Proceso:
├── executionStages[] - Etapas en ejecución
├── waitingStages[] - Etapas de espera
├── finalStages[] - Etapas finales
└── processStages[] - Controles de calidad por etapa

Estilos y Utilidades:
├── getStatusColor(status) → Clases CSS por estado
├── uniqueProviders - Lista de proveedores únicos
└── uniqueStatuses - Lista de estados únicos
```

---

## Patrón: Logo como Retorno Seguro al Panel Maestro

**Agregado:** 2026-06-02 (plan acceso-panel-administracion-header v2.1)

El header del Portal de Servicios usa el logotipo como punto de retorno seguro al panel maestro para usuarios administrativos.

### Componentes involucrados

- `src/components/molecules/LogoSolidSolutions.tsx` — Logo (átomo visual, sin lógica)
- `src/components/atoms/Button.tsx` — Átomo con extensión `aria-label` para accesibilidad
- `src/components/molecules/AdminLoginLock.tsx` — Modal de re-verificación con a11y completa
- `src/hooks/useIsAdmin.ts` — Hook que consulta `AppContext` + `constants/roles.ts`
- `src/constants/roles.ts` — SSOT espejo del backend
- `src/pages/ServicePortal/PortalLayout.tsx` — Composición final

### Flujo

```
[Usuario NO admin]     →  <div aria-hidden><LogoSolidSolutions /></div>   (estático)
[Usuario admin]        →  <Button onClick={handleLogoClick}>
                            <LogoSolidSolutions />
                          </Button>
[handleLogoClick]
  ├── sessionStorage.fromAdmin === 'true'  →  navigate('/')
  └── sessionStorage.fromAdmin !== 'true'  →  setIsAdminLockOpen(true)
                                                ↓
                                            [AdminLoginLock modal]
                                                ↓
                                            onUnlock(password)
                                                ↓
                                  sessionStorage.setItem('fromAdmin', 'true')
                                                ↓
                                            navigate('/')
```

### Limpieza de `fromAdmin` (ciclo de vida)

- **Set:** en `onUnlock` exitoso de `AdminLoginLock`
- **Read:** lazy init en `useState` de `PortalLayout`
- **Clear:** en 4 lugares
  1. `AppContext.tsx` reducer `LOGOUT` (primario)
  2. `Sidebar.tsx` `handleLogout` (primario)
  3. `ServicePortal.tsx` `onLogout` (primario)
  4. `PortalLayout.tsx` `useEffect` cleanup al desmontar (respaldo defensivo)

### Consideraciones de seguridad

- El flag `fromAdmin` es puramente cosmético. **No escala privilegios**.
- La autorización real ocurre en el backend en cada endpoint protegido.
- Es aceptable que devtools pueda setear `fromAdmin=true` (UX), pero no se acepta XSS persistente.

---

## Patrón: Filtros en Cascada + Columna de Revisión en `MyDevelopments`

**Agregado:** 2026-06-03

La página `/developments` (`pages/MyDevelopments/`) usa dos patrones que conviene documentar porque otros módulos podrían adoptarlos.

### Componentes y hooks

- `src/hooks/useColumnFilters.ts` — Hook genérico de filtros + sort + búsqueda. Devuelve `filteredData`, `uniqueValues`, **`cascadingOptions`** (nuevo), `filters`, `setColumnFilter`, etc.
- `src/pages/MyDevelopments/hooks/useReviewedDevelopments.ts` — Hook específico para el check de revisión por fila, con persistencia en `localStorage` (clave `my_developments_reviewed`).
- `src/components/molecules/DataTable.tsx` — Tabla genérica que recibe `columnOptions` (lo que el usuario ve en cada dropdown).
- `src/pages/MyDevelopments/components/columns.tsx` — Definición de las 13 columnas. `getColumns(resolveUserName, reviewed?)` inserta la columna `__review__` al inicio cuando se pasa el segundo arg.
- `src/pages/MyDevelopments/components/MyDevelopmentsHeader.tsx` — Header con chips de estado, búsqueda, "Nueva Actividad" y los botones "Limpiar N filtros" (rojo) y "Borrar N check(s)" (ámbar).

### Cascada de filtros (faceted search)

`useColumnFilters(data, accessors, storageKey, cascade=true)` calcula `cascadingOptions` en un `useMemo` separado. Para cada columna K, las opciones son los valores únicos de K en las filas que pasan **todos los demás filtros activos**, unidos con los valores ya seleccionados en K (para no perder chips cuando un filtro descarte un valor previamente elegido).

- Si no hay filtros activos, `cascadingOptions === uniqueValues` (mismo resultado, no costo extra).
- Si `cascade=false`, devuelve `uniqueValues` sin restricción (modo "legacy").

El consumidor (`MyDevelopments`) pasa `columnOptions={cascadingOptions}` al `DataTable`. Otros módulos que usen `useColumnFilters` deben decidir conscientemente: por defecto la cascada está activa.

### Columna de revisión (frontend-only)

- Hook `useReviewedDevelopments()` persiste el `Set<string>` de IDs marcados en `localStorage` bajo la clave `my_developments_reviewed`.
- Sincroniza entre pestañas vía `window.addEventListener('storage', …)`.
- El Checkbox se renderiza con `aria-label="Marcar actividad {id} como revisada"` para TTS.
- `e.stopPropagation()` en el wrapper evita que el click del checkbox propague al `onRowClick` del `DataTable` (que navega al detalle).
- El botón "Borrar N check(s)" aparece solo si hay al menos 1 marcado, paralelo semántico al "Limpiar N filtros".

### Gotchas a recordar

- **No es fuente de verdad del backend.** Es marca personal/equipo. Si el equipo cambia de navegador o limpia storage, los checks se pierden.
- **No se migra si se renombra la clave.** Si `my_developments_reviewed` cambia, los checks existentes quedan huérfanos en localStorage.
- **Performance:** con 12 columnas y N filas, la cascada itera `12 × N` por cambio de filtro. Para N < 5000 es despreciable; sobre eso considerar memoizar por `data` + `filters` signature.

---

## Features: Plantillas de horario y alcance de empleados

**Agregado:** 2026-07-10

Las rutas de features del Portal de Servicios se extrajeron a `src/pages/ServicePortal/routes/featureRoutes.tsx`. Cada pantalla nueva se carga con `React.lazy` y queda envuelta por `ProtectedRoute` con un permiso independiente:

- `/service-portal/horas-extras/plantillas` -> `nomina_horas_extras.plantillas_horario.administrar`.
- `/service-portal/alcance-empleados` -> `alcance_empleados.administrar`.
- `/service-portal/biometria` -> `biometria`.

### Limites por capa

| Capa | Responsabilidad |
|---|---|
| `src/config/api.ts` | Paths API sin URLs hardcodeadas en paginas. |
| `src/services/horariosRelacionesService.ts` | Fetch autenticado, errores tipados, serializacion multivalor y `AbortSignal`. |
| `src/types/horariosRelaciones.ts` | DTO de plantillas, empleados, relaciones, disponibilidad y GeoFace admin. |
| `PlantillasHorario/hooks/usePlantillasHorario.ts` | Estado remoto y acciones del catalogo. |
| `AlcanceEmpleados/hooks/useAlcanceEmpleados.ts` | Gestor, semana, filtros remotos, paginacion, debounce y cancelacion. |
| Paginas `index.tsx` | Coordinacion de estado, modales, seleccion y notificaciones. |
| `components/` | Render desktop/mobile y acciones presentacionales. |

### Editor semanal

`WeeklyScheduleEditor` es controlado y reutilizable por Plantillas, Horario y Planificador. Edita siete dias, francos, almuerzo y `cruza_medianoche`; no conoce endpoints ni permisos. `DefaultHorarioSemana` compone este editor para mantener el flujo existente.

### Relaciones responsive

`AlcanceEmpleados` mantiene la seleccion por cedula fuera de la pagina visible. En escritorio usa `EmpleadosRelacionTable`; en movil usa `EmpleadosRelacionCards`. Los datos de empleado se concentran en `EmpleadoDatos` para no duplicar nombre, cedula, cargo, area, ciudad, jefe y badges HE.

El hook aplica debounce de 250 ms y cancela solicitudes anteriores con `AbortController`. Los filtros se envian al backend; la pagina no usa la pagina cargada como fuente de verdad para totales o facetas.

### Autoridad y seguridad

Las guardas frontend solo controlan navegacion y visibilidad. Backend conserva la autoridad sobre permiso funcional, alcance por cedula, idempotencia y respuesta `403/404`. GeoFace consulta `/biometria/admin/capacidades` para habilitar supervision, pero cada listado y evidencia vuelve a validar alcance.

### Hardening posterior a revision

- La `solicitud_id` de Relaciones y Aplicaciones se conserva en un `ref` mientras no cambie el payload y solo se descarta tras exito, cancelacion o cambio de seleccion.
- `Modal` mantiene un stack global y un contador de scroll locks: Escape y focus trap pertenecen solo al modal superior, y el foco vuelve al disparador al cerrar.
- `utils/validarTurno.ts` centraliza la coherencia de pares de horas, francos, igualdad, almuerzo y `cruza_medianoche` para editores individuales y masivos.
- Relaciones impide preparar mas de 200 cambios, bloquea doble submit y refresca empleados y conteos de gestores tras guardar.
- Biometria diferencia error de capacidades de ausencia de permiso, permite reintento, implementa tabs ARIA con flechas y confirma la eliminacion de zonas en un modal.

## Hub de Gestion de Tiempo y Asistencia

**Agregado:** 2026-07-12

El tablero del Portal de Servicios expone una sola entrada para horarios, horas extras, biometria, plantillas y alcance de empleados. La ruta `/service-portal/tiempo-asistencia` carga de forma diferida el modulo `GestionTiempoAsistencia` y organiza las opciones autorizadas en Asistencia, Planificacion, Horas extras y Administracion.

`gestionTiempoAsistenciaConfig.ts` es la unica fuente de metadatos de navegacion del hub: seccion, ruta, permiso exacto y estado de modulo aplicable. `DashboardView` deriva la visibilidad de la tarjeta principal del mismo filtro, evitando reglas duplicadas. Los permisos se comparan de forma exacta y no existen bypasses por rol.

La configuracion solo gobierna presentacion y descubrimiento. Cada destino conserva su `ProtectedRoute` historico y el backend mantiene la autoridad sobre RBAC, alcance y datos sensibles. `BiometriaModule` sigue consultando capacidades remotas antes de habilitar la supervision del equipo.

`ServiceCard` usa una primitiva `Button` del sistema de diseno para conservar foco visible, semantica interactiva y navegacion por teclado. Las vistas de primer nivel vuelven al hub; detalles y formularios mantienen su lista padre.
