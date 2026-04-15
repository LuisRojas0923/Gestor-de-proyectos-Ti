import { useState, useCallback, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';

export interface EquipoMovil {
  id: number;
  marca?: string;
  modelo: string;
  imei?: string;
  serial?: string;
  estado_fisico: string;
  observaciones?: string;
}

export interface PersonaLinea {
  documento: string;
  nombre: string;
  tipo: string;
  cargo?: string;
  area?: string;
  centro_costo?: string;
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

export interface CorporateLine {
  id: number;
  fecha_actualizacion: string | null;
  linea: string;
  empresa: string;
  estatus: string;
  estado_asignacion: string;
  equipo_id?: number;
  documento_asignado?: string;
  documento_cobro?: string;
  equipo?: EquipoMovil;
  asignado?: PersonaLinea;
  responsable_cobro?: PersonaLinea;
  
  // Coeficientes y Finanzas
  cobro_fijo_coef: number;
  cobro_especiales_coef: number;
  nombre_plan?: string;
  convenio?: string;
  aprobado_por?: string;
  
  cfm_con_iva?: number;
  cfm_sin_iva?: number;
  descuento_39?: number;
  vr_factura?: number;
  pago_empleado?: number;
  pago_empresa?: number;
  primera_quincena?: number;
  segunda_quincena?: number;

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
    try {
      const [linesRes, equiposRes, personasRes] = await Promise.all([
        get('/lineas-corporativas/'),
        get('/lineas-corporativas/equipos'),
        get('/lineas-corporativas/personas')
      ]);

      setLines(linesRes as CorporateLine[]);
      setEquipos(equiposRes as EquipoMovil[]);
      setPersonas(personasRes as PersonaLinea[]);
      
      // Alertas en paralelo
      get('/lineas-corporativas/alertas-empleados')
        .then((alertRes: any) => {
          if (alertRes && alertRes.alertas) {
            setEmployeeAlerts(alertRes.alertas);
          }
        })
        .catch(err => console.error("Error al cargar alertas:", err));

    } catch (err: any) {
      setError(err?.message || 'Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  }, [get]);

  const createLine = async (data: Partial<CorporateLine>) => {
    const res = await post('/lineas-corporativas/', data);
    await loadData();
    return res as CorporateLine;
  };

  const updateLine = async (id: number, data: Partial<CorporateLine>) => {
    const res = await put(`/lineas-corporativas/${id}`, data);
    await loadData();
    return res as CorporateLine;
  };

  const deleteLine = async (id: number) => {
    await del(`/lineas-corporativas/${id}`);
    await loadData();
  };

  const createEquipo = async (data: Partial<EquipoMovil>) => {
    const res = await post('/lineas-corporativas/equipos', data);
    setEquipos(prev => [...prev, res as EquipoMovil]);
    return res as EquipoMovil;
  };

  const createPersona = async (data: Partial<PersonaLinea>) => {
    const res = await post('/lineas-corporativas/personas', data);
    setPersonas(prev => [...prev, res as PersonaLinea]);
    return res as PersonaLinea;
  };

  const importarFactura = async (periodo: string, file: File) => {
    const formData = new FormData();
    formData.append('archivo', file);
    const res = await post(`/lineas-corporativas/importar-factura?periodo=${periodo}`, formData);
    await loadData();
    return res;
  };

  const importarMatrizLegacy = async (file: File) => {
    const formData = new FormData();
    formData.append('archivo', file);
    const res = await post('/lineas-corporativas/migracion-legacy', formData);
    await loadData();
    return res;
  };

  const obtenerReporteCO = async (periodo: string) => {
    return await get(`/lineas-corporativas/reporte-co?periodo=${periodo}`);
  };

  const obtenerAlertasFactura = async (periodo: string) => {
    return await get(`/lineas-corporativas/alertas-factura/${periodo}`);
  };

  const obtenerDetalleFactura = async (periodo: string) => {
    return await get(`/lineas-corporativas/detalle-factura/${periodo}`);
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
    createPersona,
    importarFactura,
    importarMatrizLegacy,
    obtenerReporteCO,
    obtenerAlertasFactura,
    obtenerDetalleFactura,
  };
};
