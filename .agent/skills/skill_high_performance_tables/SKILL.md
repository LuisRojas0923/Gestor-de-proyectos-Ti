# Skill: High-Performance Tables & UX Patterns

## Propósito
Esta skill define los estándares para implementar tablas que manejan grandes volúmenes de datos sin degradar la experiencia del usuario (lag o bloqueo del hilo principal).

## Principios de Diseño
1. **Contenedores Controlados**: Toda tabla extensa debe estar envuelta en un contenedor con `max-height` y `overflow-y-auto`.
2. **Encabezados Pegajosos (Sticky Headers)**: Los encabezados deben permanecer visibles al hacer scroll.
3. **Jerarquía Visual Premium**: Uso de colores corporativos (Navy Blue #000080) para los encabezados y tipografías legibles (Inter/Roboto).
4. **Manejadores de Carga**: Implementación de skeletons o estados de carga asíncrona para retroalimentación inmediata.

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
