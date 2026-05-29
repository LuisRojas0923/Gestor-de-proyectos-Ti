# Estándar de Implementación: Novedades de Nómina

Este documento define el patrón obligatorio para la implementación de nuevas subcategorías en el módulo de Novedades de Nómina, utilizando **GRANCOOP** como la referencia técnica y visual oficial.

## 1. Diseño y UI (Frontend)
Todas las subcategorías deben replicar exactamente la interfaz de `GrancoopPreview.tsx`:

- **Layout**: Header con título gradiente, selector de periodo (Mes/Año) y sección de carga de archivos.
- **Micro-interacciones**: Estados de carga (`isProcessing`, `isLoading`) y notificaciones del sistema.
- **Estadísticas**: Uso de tarjetas informativas para Totales, Asociados y Alertas.
- **Tabla de Datos**: 
  - Cabecera fija (`sticky`).
  - Filtros integrados (Búsqueda por texto y Select por concepto).
  - Paginación o scroll interno.
- **Alertas (Warnings)**: Botón con Badge cuando existen inconsistencias, abriendo un modal con el detalle (`cedula`, `nombre`, `motivo`).

## 2. Estructura de Datos (API)
La respuesta de los endpoints `preview` y `datos` debe seguir este esquema JSON:

```json
{
  "rows": [
    { "cedula": "string", "nombre_asociado": "string", "empresa": "string", "valor": number, "concepto": "string", "estado_validacion": "string" }
  ],
  "summary": {
    "total_asociados": number,
    "total_filas": number,
    "total_valor": number,
    "total_warnings": number,
    "mes": number,
    "anio": number
  },
  "warnings_detalle": [
    { "cedula": "string", "nombre": "string", "motivo": "string" }
  ]
}
```

## 3. Flujo de Backend
1. **Extracción**: Lógica específica por subcategoría/archivo.
2. **Enriquecimiento ERP**: Cruce obligatorio con la base de datos ERP para validar estados (ACTIVO/INACTIVO/NO ENCONTRADO).
3. **Persistencia**: Limpiezas previas del periodo y guardado en `NominaRegistroNormalizado`.
4. **Validación**: Marcado de `estado_validacion` como "OK" o el motivo del error.

> [!IMPORTANT]
> No se deben crear diseños nuevos. Si una subcategoría requiere columnas adicionales, se integran en la tabla existente manteniendo el estilo base.
