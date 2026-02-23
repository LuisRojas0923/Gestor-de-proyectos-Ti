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
