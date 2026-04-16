---
name: High-Performance Tables & UX Patterns
description: Define estándares para tablas de alto rendimiento con filtros por columna tipo Excel (popover), virtualización ligera y estados de carga premium.
---

# Skill: High-Performance Tables & UX Patterns

## Propósito
Esta skill define los estándares para implementar tablas que manejan grandes volúmenes de datos sin degradar la experiencia del usuario, incluyendo el patrón de **filtros por columna tipo Excel** con popover.

## Principios de Diseño
1. **Contenedores Controlados**: Toda tabla extensa debe estar envuelta en un contenedor con `max-height` y `overflow-auto`.
2. **Encabezados Pegajosos (Sticky Headers)**: Los encabezados deben permanecer visibles al hacer scroll.
3. **Jerarquía Visual Premium**: Uso de colores corporativos (Navy Blue `#000080`) para los encabezados y tipografías legibles (Inter/Roboto).
4. **Manejadores de Carga**: Implementación de skeletons o estados de carga asíncrona para retroalimentación inmediata.
5. **Filtros por Columna (Excel-like)**: Cada columna puede tener un filtro popover que NO ocupa espacio vertical extra y se activa al hacer click.

---

## Patrones Técnicos (React/CSS)

### 1. Estructura de Contenedor
```tsx
<div className="relative overflow-auto max-h-[600px] shadow-inner rounded-xl">
  <table className="w-full text-left border-collapse">
    <thead className="sticky top-0 z-20 bg-[#000080] text-white">
      <tr className="bg-[#000080]">
        <th className="p-3 text-[10px] font-bold uppercase tracking-wider">Columna</th>
        {/* ... */}
      </tr>
    </thead>
    <tbody className="divide-y divide-neutral-200">
      {/* Filas */}
    </tbody>
  </table>
</div>
```

### 2. Optimización de Renderizado (Virtualización Ligera)
Para evitar el lag en el mapeo de +1000 filas:
- Usar `React.memo` en los componentes de fila.
- Implementar paginación en el frontend o un "Cargar más" si no se usa una librería de virtualización o simplemente limitar el renderizado inicial y aumentar con un debounce al scrollear.

### 3. Estados de Carga (Skeletons)
Siempre mostrar un estado de carga mientras `isLoading` es true para evitar saltos bruscos en el Layout.

---

## 4. Filtros por Columna — Patrón Popover (Excel-like)

Este es el patrón recomendado para filtrado en tablas. Proporciona la funcionalidad de Excel sin sacrificar la estética premium corporativa.

### 4.1. Filosofía de Diseño

| Criterio         | Decisión                                                                |
|------------------|-------------------------------------------------------------------------|
| **Estilo**       | Popover flotante — NO inputs inline ni filas de filtro permanentes      |
| **Activación**   | Click en un ícono sutil (▾ o funnel) ubicado al lado del título del `<th>` |
| **Apariencia**   | Glassmorphism: fondo con `backdrop-blur`, borde sutil, sombra suave     |
| **Contenido**    | Buscador de texto + lista de checkboxes con los valores únicos          |
| **Animación**    | Entrada suave con `scale` + `opacity` (150ms ease-out)                  |

### 4.2. Estructura del Header con Filtro

```tsx
{/* Cada <th> incluye un botón de filtro */}
<th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest opacity-90">
  <div className="flex items-center gap-1.5">
    <span>Nombre Columna</span>
    <button
      onClick={(e) => { e.stopPropagation(); toggleFilter('columnKey'); }}
      className={`p-1 rounded-md transition-all hover:bg-white/20
        ${hasActiveFilter('columnKey') ? 'text-yellow-300' : 'text-white/50 hover:text-white'}`}
    >
      <FilterIcon size={12} />
    </button>
  </div>
</th>
```

**Indicador visual obligatorio**: Cuando una columna tiene un filtro activo, el ícono debe cambiar de color (ej. amarillo/dorado) para que el usuario sepa que hay filtros aplicados.

### 4.3. Componente Popover de Filtro

```tsx
/**
 * ColumnFilterPopover — Componente reutilizable de filtro por columna.
 *
 * REGLA CRÍTICA DE VISIBILIDAD:
 * El popover NUNCA debe quedar oculto detrás de otros elementos.
 * Ver sección 4.4 para las reglas de posicionamiento.
 */
interface ColumnFilterPopoverProps {
  columnKey: string;
  title: string;
  options: string[];          // Valores únicos de la columna
  selectedValues: Set<string>;
  onSelectionChange: (columnKey: string, values: Set<string>) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>; // Referencia al <th> para posicionamiento
}

const ColumnFilterPopover: React.FC<ColumnFilterPopoverProps> = ({
  title, options, selectedValues, onSelectionChange, onClose, columnKey, anchorRef
}) => {
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      ref={popoverRef}
      className="
        absolute z-[9999] mt-2 min-w-[220px] max-w-[300px]
        bg-white/95 dark:bg-neutral-800/95
        backdrop-blur-xl
        border border-neutral-200 dark:border-neutral-600
        rounded-2xl shadow-2xl
        animate-in fade-in zoom-in-95 duration-150
        overflow-visible
      "
      style={computePopoverPosition(anchorRef)} // Ver sección 4.4
    >
      {/* Header del Popover */}
      <div className="px-4 pt-4 pb-2 border-b border-neutral-100 dark:border-neutral-700">
        <Text variant="caption" weight="bold" className="uppercase tracking-wider opacity-60">
          Filtrar: {title}
        </Text>
      </div>

      {/* Buscador */}
      <div className="px-3 py-2">
        <div className="relative">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="
              w-full pl-9 pr-3 py-2 text-sm rounded-xl
              bg-neutral-100 dark:bg-neutral-700
              border border-transparent focus:border-primary-400
              outline-none transition-colors
            "
            autoFocus
          />
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="px-3 flex gap-2 text-[11px]">
        <button onClick={selectAll} className="text-primary-500 hover:underline font-medium">
          Seleccionar todo
        </button>
        <span className="text-neutral-300">|</span>
        <button onClick={clearAll} className="text-red-400 hover:underline font-medium">
          Limpiar
        </button>
      </div>

      {/* Lista de Opciones con Checkboxes */}
      <div className="px-3 py-2 max-h-[200px] overflow-y-auto custom-scrollbar">
        {filtered.map(option => (
          <label
            key={option}
            className="
              flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer
              hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-sm
            "
          >
            <input
              type="checkbox"
              checked={selectedValues.has(option)}
              onChange={() => toggleOption(option)}
              className="rounded accent-primary-500"
            />
            <span className="truncate">{option || '(Vacío)'}</span>
          </label>
        ))}
      </div>

      {/* Footer con conteo */}
      <div className="px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-700 text-[11px] text-neutral-400">
        {selectedValues.size} de {options.length} seleccionados
      </div>
    </div>
  );
};
```

### 4.4. REGLAS CRÍTICAS DE VISIBILIDAD (Anti-Recorte)

> ⚠️ **PROBLEMA COMÚN**: El popover se renderiza dentro de un contenedor con `overflow: auto/hidden`,
> lo que causa que quede **cortado o invisible**. Esto es INACEPTABLE.

**Estrategias obligatorias (en orden de preferencia):**

#### Estrategia A: React Portal (RECOMENDADA)
Renderizar el popover **fuera del DOM del contenedor de la tabla**, directamente en `document.body`:

```tsx
import { createPortal } from 'react-dom';

// Dentro del componente de la tabla:
{activeFilter && createPortal(
  <ColumnFilterPopover
    {...filterProps}
    // Posición calculada respecto al viewport
    style={{
      position: 'fixed',
      top: anchorRect.bottom + 4,
      left: anchorRect.left,
    }}
  />,
  document.body
)}
```

**¿Por qué?** Al estar fuera del árbol DOM del contenedor scrollable, ningún `overflow: hidden/auto` del padre puede recortarlo.

#### Estrategia B: Posicionamiento con `position: fixed`
Si no se usa portal, el popover DEBE usar `position: fixed` con coordenadas calculadas del viewport:

```tsx
const computePopoverPosition = (anchorRef: React.RefObject<HTMLElement>) => {
  if (!anchorRef.current) return {};
  const rect = anchorRef.current.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const opensUpward = spaceBelow < 300; // Si no hay espacio abajo, abrir hacia arriba

  return {
    position: 'fixed' as const,
    left: `${rect.left}px`,
    ...(opensUpward
      ? { bottom: `${window.innerHeight - rect.top + 4}px` }  // Abre hacia arriba
      : { top: `${rect.bottom + 4}px` }                        // Abre hacia abajo
    ),
  };
};
```

#### Estrategia C: Escape del overflow (MÍNIMO ACEPTABLE)
Si absolutamente debe estar dentro del DOM de la tabla, el contenedor scrollable padre DEBE tener `overflow: visible` en el eje donde se muestra el popover, o el popover debe tener un z-index suficiente (`z-[9999]`).

> **NUNCA** dejar el popover con `position: absolute` dentro de un padre con `overflow: auto` sin verificar que sea completamente visible.

### 4.5. Detección Inteligente de Bordes (Edge Detection)

El popover debe detectar si está cerca del borde inferior o derecho de la ventana y ajustar su posición:

```tsx
const adjustPosition = (anchorRect: DOMRect) => {
  const POPOVER_HEIGHT = 350; // Altura estimada del popover
  const POPOVER_WIDTH = 280;
  const MARGIN = 8;

  let top = anchorRect.bottom + 4;
  let left = anchorRect.left;

  // Si no cabe abajo, abrir hacia arriba
  if (top + POPOVER_HEIGHT > window.innerHeight - MARGIN) {
    top = anchorRect.top - POPOVER_HEIGHT - 4;
  }

  // Si se sale por la derecha, alinear al borde derecho del anchor
  if (left + POPOVER_WIDTH > window.innerWidth - MARGIN) {
    left = anchorRect.right - POPOVER_WIDTH;
  }

  return { top, left };
};
```

### 4.6. Hook Reutilizable `useColumnFilters`

```tsx
/**
 * Hook centralizado para manejar el estado de filtros por columna.
 * Devuelve los filtros activos, las funciones para manipularlos,
 * y la función para aplicar los filtros sobre los datos.
 */
function useColumnFilters<T>(data: T[], columnAccessors: Record<string, (row: T) => string>) {
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [activePopover, setActivePopover] = useState<string | null>(null);

  // Extraer valores únicos por columna
  const uniqueValues = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const [key, accessor] of Object.entries(columnAccessors)) {
      const values = [...new Set(data.map(accessor).filter(Boolean))].sort();
      result[key] = values;
    }
    return result;
  }, [data, columnAccessors]);

  // Aplicar filtros sobre los datos
  const filteredData = useMemo(() => {
    return data.filter(row => {
      for (const [key, selectedValues] of Object.entries(filters)) {
        if (selectedValues.size === 0) continue; // Sin filtro = mostrar todo
        const accessor = columnAccessors[key];
        if (!accessor) continue;
        const value = accessor(row);
        if (!selectedValues.has(value ?? '')) return false;
      }
      return true;
    });
  }, [data, filters, columnAccessors]);

  const hasActiveFilter = (key: string) => (filters[key]?.size ?? 0) > 0;
  const activeFilterCount = Object.values(filters).filter(s => s.size > 0).length;

  const clearAllFilters = () => setFilters({});

  return {
    filters,
    setFilters,
    filteredData,
    uniqueValues,
    activePopover,
    setActivePopover,
    hasActiveFilter,
    activeFilterCount,
    clearAllFilters,
  };
}
```

### 4.7. Resumen Visual del Patrón

```
┌──────────────────────────────────────────────────────────────┐
│  LÍNEA  ▾     │  ASIGNADO A  ▾*  │  ESTADO  ▾  │  PAGO     │  ← Header Navy Blue
├──────────────────────────────────────────────────────────────┤  * = filtro activo (dorado)
│  3101234567   │  Juan Pérez       │  ● ACTIVA   │  $45,000  │
│  3109876543   │  María López      │  ● ACTIVA   │  $32,000  │
│               │                   │             │           │
│               │  ┌──────────────────────────┐   │           │
│               │  │ Filtrar: Asignado A      │   │           │  ← Popover: Glassmorphism
│               │  │ ┌────────────────────┐   │   │           │     + backdrop-blur
│               │  │ │ 🔍 Buscar...       │   │   │           │
│               │  │ └────────────────────┘   │   │           │
│               │  │ Seleccionar todo | Limpiar│   │           │
│               │  │ ☑ Juan Pérez             │   │           │
│               │  │ ☑ María López            │   │           │
│               │  │ ☐ Sin Asignar            │   │           │
│               │  │                          │   │           │
│               │  │ 2 de 3 seleccionados     │   │           │
│               │  └──────────────────────────┘   │           │
└──────────────────────────────────────────────────────────────┘
```

### 4.8. Checklist de Implementación

Antes de considerar completa la implementación de filtros en una tabla, verificar:

- [ ] Cada `<th>` tiene un ícono de filtro clickeable
- [ ] El ícono cambia de color cuando la columna tiene filtro activo
- [ ] El popover se renderiza usando **React Portal** (`createPortal`)
- [ ] El popover tiene **detección de bordes** (no se corta abajo/derecha)
- [ ] El popover tiene **glassmorphism** (`backdrop-blur-xl`, sombra, bordes suaves)
- [ ] El popover incluye buscador de texto con autofocus
- [ ] El popover incluye checkboxes con valores únicos de la columna
- [ ] Botones de "Seleccionar todo" y "Limpiar" están presentes
- [ ] El conteo de seleccionados se muestra en el footer
- [ ] Click fuera del popover lo cierra
- [ ] Tecla `Escape` cierra el popover
- [ ] Se muestra un indicador global de "N filtros activos" con opción de limpiar todos
- [ ] Animación de entrada/salida suave (fade + zoom)
- [ ] El hook `useColumnFilters` centraliza todo el estado
