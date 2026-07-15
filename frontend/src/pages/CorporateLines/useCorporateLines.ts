import { useState, useCallback, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { API_ENDPOINTS } from '../../config/api';

export interface EquipoMovil {
  id: number;
  marca?: string | null;
  modelo: string;
  imei?: string | null;
  serial?: string | null;
  estado_fisico: string;
  observaciones?: string | null;
}

export interface PersonaLinea {
  documento: string;
  nombre: string;
  tipo: string;
  cargo?: string | null;
  area?: string | null;
  centro_costo?: string | null;
}

export interface ResumenCORow {
  co: string;
  cargo_mes: number;
  descuento_mes: number;
  impoconsumo: number;
  descuento_iva: number;
  iva_19: number;
  total: number;
}

export interface FacturaDetalleRow {
  id: number;
  min: string;
  nombre: string;
  descripcion: string;
  valor: number;
  iva: number;
  ciclo: string;
  criterio: string;
}

export interface FacturaAlerta {
  id: number;
  linea_id: number;
  numero: string;
  total: number;
}

export interface ResultadoMigracionLegacy {
  mensaje?: string;
  lineas_procesadas: number;
}

export interface CorporateLine {
  id: number;
  fecha_actualizacion: string | null;
  linea: string;
  empresa: string;
  estatus: string;
  estado_asignacion: string;
  equipo_id?: number | null;
  documento_asignado?: string | null;
  documento_cobro?: string | null;
  equipo?: EquipoMovil | null;
  asignado?: PersonaLinea | null;
  responsable_cobro?: PersonaLinea | null;
  
  // Coeficientes y Finanzas
  cobro_fijo_coef: number;
  cobro_especiales_coef: number;
  nombre_plan?: string | null;
  convenio?: string | null;
  aprobado_por?: string | null;
  
  cfm_con_iva?: number | null;
  cfm_sin_iva?: number | null;
  descuento_39?: number | null;
  vr_factura?: number | null;
  pago_empleado?: number | null;
  pago_empresa?: number | null;
  primera_quincena?: number | null;
  segunda_quincena?: number | null;

  observaciones?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const useCorporateLines = () => {
  const { get, post, put, delete: del } = useApi();
  const [lines, setLines] = useState<CorporateLine[]>([]);
  const [equipos, setEquipos] = useState<EquipoMovil[]>([]);
  const [personas, setPersonas] = useState<PersonaLinea[]>([]);
  const [employeeAlerts, setEmployeeAlerts] = useState<Record<string, { inactivo: boolean; motivos: string; clase: 'WARNING' | 'CRITICAL' }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorValue, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [linesRes, equiposRes, personasRes] = await Promise.all([
        get(API_ENDPOINTS.CORPORATE_LINES),
        get(API_ENDPOINTS.CORPORATE_EQUIPMENT),
        get(API_ENDPOINTS.CORPORATE_PEOPLE)
      ]);

      setLines(linesRes as CorporateLine[]);
      setEquipos(equiposRes as EquipoMovil[]);
      setPersonas(personasRes as PersonaLinea[]);
      setError(null);
      
      // Alertas en paralelo
      get(API_ENDPOINTS.CORPORATE_EMPLOYEE_ALERTS)
        .then((alertRes: unknown) => {
          if (alertRes && typeof alertRes === 'object' && 'alertas' in alertRes) {
            setEmployeeAlerts((alertRes as { alertas: Record<string, { inactivo: boolean; motivos: string; clase: 'WARNING' | 'CRITICAL' }> }).alertas);
          }
        })
        .catch(err => console.error("Error al cargar alertas:", err));

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  }, [get]);

  const createLine = async (data: Partial<CorporateLine>) => {
    const res = await post(API_ENDPOINTS.CORPORATE_LINES, data);
    await loadData();
    return res as CorporateLine;
  };

  const updateLine = async (id: number, data: Partial<CorporateLine>) => {
    const res = await put(API_ENDPOINTS.CORPORATE_LINE_BY_ID(id), data);
    await loadData();
    return res as CorporateLine;
  };

  const deleteLine = async (id: number) => {
    await del(API_ENDPOINTS.CORPORATE_LINE_BY_ID(id));
    await loadData();
  };

  const createEquipo = async (data: Partial<EquipoMovil>) => {
    const res = await post(API_ENDPOINTS.CORPORATE_EQUIPMENT, data);
    setEquipos(prev => [...prev, res as EquipoMovil]);
    return res as EquipoMovil;
  };

  const updateEquipo = async (id: number, data: Partial<EquipoMovil>) => {
    const res = await put(API_ENDPOINTS.CORPORATE_EQUIPMENT_BY_ID(id), data);
    setEquipos(prev => prev.map(e => e.id === id ? res as EquipoMovil : e));
    return res as EquipoMovil;
  };

  const deleteEquipo = async (id: number) => {
    await del(API_ENDPOINTS.CORPORATE_EQUIPMENT_BY_ID(id));
    setEquipos(prev => prev.filter(e => e.id !== id));
  };

  const createPersona = async (data: Partial<PersonaLinea>) => {
    const res = await post(API_ENDPOINTS.CORPORATE_PEOPLE, data);
    setPersonas(prev => [...prev, res as PersonaLinea]);
    return res as PersonaLinea;
  };

  const updatePersona = async (documento: string, data: Partial<PersonaLinea>) => {
    const res = await put(API_ENDPOINTS.CORPORATE_PERSON_BY_ID(documento), data);
    setPersonas(prev => prev.map(p => p.documento === documento ? res as PersonaLinea : p));
    return res as PersonaLinea;
  };

  const deletePersona = async (documento: string) => {
    await del(API_ENDPOINTS.CORPORATE_PERSON_BY_ID(documento));
    setPersonas(prev => prev.filter(p => p.documento !== documento));
  };

  const importarFactura = async (periodo: string, file: File) => {
    const formData = new FormData();
    formData.append('archivo', file);
    const res = await post(API_ENDPOINTS.CORPORATE_INVOICE_IMPORT(periodo), formData);
    await loadData();
    return res;
  };

  const importarMatrizLegacy = async (file: File) => {
    const formData = new FormData();
    formData.append('archivo', file);
    const res = await post(API_ENDPOINTS.CORPORATE_LEGACY_MIGRATION, formData);
    await loadData();
    return res as ResultadoMigracionLegacy;
  };

  const obtenerReporteCO = async (periodo: string): Promise<ResumenCORow[]> => {
    return await get(API_ENDPOINTS.CORPORATE_REPORT(periodo)) as ResumenCORow[];
  };

  const obtenerAlertasFactura = async (periodo: string): Promise<FacturaAlerta[]> => {
    return await get(API_ENDPOINTS.CORPORATE_INVOICE_ALERTS(periodo)) as FacturaAlerta[];
  };

  const obtenerDetalleFactura = async (periodo: string): Promise<FacturaDetalleRow[]> => {
    return await get(API_ENDPOINTS.CORPORATE_INVOICE_DETAIL(periodo)) as FacturaDetalleRow[];
  };

  const stats = useMemo(() => {
    return {
      total: lines.length,
      active: lines.filter(l => l.estatus === 'ACTIVA').length,
      inactive: lines.filter(l => l.estatus !== 'ACTIVA').length,
      assigned: lines.filter(l => l.estado_asignacion === 'ASIGNADA').length,
      unassigned: lines.filter(l => l.estado_asignacion !== 'ASIGNADA').length,
      withAlerts: lines.filter(l => l.documento_asignado && employeeAlerts[l.documento_asignado]).length,
      totalMonthlyCost: lines.reduce((acc, l) => acc + (l.cfm_con_iva || 0), 0),
      phonesAssigned: lines.filter(l => !!l.equipo_id).length,
      // Convenios (basado en pago_empleado)
      convenio0: lines.filter(l => l.pago_empleado === 0).length,
      convenio100: lines.filter(l => l.pago_empleado && l.pago_empleado > 0 && l.pago_empleado >= (l.vr_factura || l.cfm_con_iva || 0)).length,
      convenioMixed: lines.filter(l => l.pago_empleado && l.pago_empleado > 0 && l.pago_empleado < (l.vr_factura || l.cfm_con_iva || 0)).length
    };
  }, [lines, employeeAlerts]);

  return {
    lines,
    equipos,
    personas,
    employeeAlerts,
    stats,
    isLoading,
    error: errorValue,
    loadData,
    createLine,
    updateLine,
    deleteLine,
    createEquipo,
    updateEquipo,
    deleteEquipo,
    createPersona,
    updatePersona,
    deletePersona,
    importarFactura,
    importarMatrizLegacy,
    obtenerReporteCO,
    obtenerAlertasFactura,
    obtenerDetalleFactura,
  };
};
