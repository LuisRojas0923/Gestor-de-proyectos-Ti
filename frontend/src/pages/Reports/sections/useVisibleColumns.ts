import { useState } from 'react';

export interface VisibleColumnsConfig {
  id_desarrollo: boolean;
  nombre_desarrollo: boolean;
  proveedor: boolean;
  etapa: boolean;
  tipo_actividad: boolean;
  fecha_inicio: boolean;
  fecha_fin: boolean;
  estado: boolean;
  actor: boolean;
  notas: boolean;
}

export const useVisibleColumns = (initialConfig?: Partial<VisibleColumnsConfig>) => {
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumnsConfig>({
    id_desarrollo: true,
    nombre_desarrollo: true,
    proveedor: true,
    etapa: true,
    tipo_actividad: false,  // ← OCULTO: Tipo Actividad
    fecha_inicio: true,
    fecha_fin: true,
    estado: false,          // ← OCULTO: Estado
    actor: true,
    notas: true,
    ...initialConfig
  });

  const updateColumn = (column: keyof VisibleColumnsConfig, visible: boolean) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: visible
    }));
  };

  const resetToDefault = () => {
    setVisibleColumns({
      id_desarrollo: true,
      nombre_desarrollo: true,
      proveedor: true,
      etapa: true,
      tipo_actividad: false,
      fecha_inicio: true,
      fecha_fin: true,
      estado: false,
      actor: true,
      notas: true
    });
  };

  const getVisibleColumnsCount = () => {
    return Object.values(visibleColumns).filter(Boolean).length;
  };

  return {
    visibleColumns,
    updateColumn,
    resetToDefault,
    getVisibleColumnsCount
  };
};
