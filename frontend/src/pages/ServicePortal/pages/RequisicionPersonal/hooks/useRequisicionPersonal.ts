import { useState, useCallback, useRef, useEffect } from 'react';
import { FORMULARIO_INICIAL, FormularioRP } from '../types/requisicion.types';
import * as api from '../services/requisicionService';

export interface WizardStep {
  id: number;
  titulo: string;
  descripcion: string;
}

export const PASOS: WizardStep[] = [
  { id: 1, titulo: 'Formulario Completo',       descripcion: 'Diligenciamiento de todos los datos requeridos' },
  { id: 2, titulo: 'Confirmación',              descripcion: 'Revise y declare los datos antes de enviar'             },
];

export function useRequisicionPersonal(
  correoSolicitante: string,
  nombreSolicitante: string,
  requisicionIdInicial?: number
) {
  const [pasoActual, setPasoActual] = useState(1);
  const [form, setForm] = useState<FormularioRP>(FORMULARIO_INICIAL);
  const [requisicionId, setRequisicionId] = useState<number | undefined>(requisicionIdInicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requisicionIdRef = useRef<number | undefined>(requisicionIdInicial);

  useEffect(() => {
    requisicionIdRef.current = requisicionIdInicial;
    setRequisicionId(requisicionIdInicial);
  }, [requisicionIdInicial]);

  const totalPasos = PASOS.length;

  const updateField = useCallback(<K extends keyof FormularioRP>(
    campo: K, valor: FormularioRP[K]
  ) => {
    let finalValue = valor;
    if (typeof finalValue === 'string') {
      finalValue = finalValue.toUpperCase() as unknown as FormularioRP[K];
    } else if (Array.isArray(finalValue)) {
      finalValue = finalValue.map(item => typeof item === 'string' ? item.toUpperCase() : item) as unknown as FormularioRP[K];
    }
    setForm(prev => ({ ...prev, [campo]: finalValue }));
  }, []);

  const irAPaso = useCallback((paso: number) => {
    if (paso >= 1 && paso <= totalPasos) setPasoActual(paso);
  }, [totalPasos]);

  const formatThousands = (val: any): string => {
    if (val === null || val === undefined || val === '') return '';
    const clean = String(val).replace(/\D/g, '');
    return clean ? Number(clean).toLocaleString('de-DE') : '';
  };

  const cleanFormPayload = (rawForm: FormularioRP) => {
    const cleanNumber = (valStr: string) => {
      if (!valStr) return null;
      const clean = valStr.replace(/\D/g, '');
      return clean ? Number(clean) : null;
    };
    return {
      ...rawForm,
      salario_asignado: cleanNumber(rawForm.salario_asignado),
      auxilio_movilizacion: cleanNumber(rawForm.auxilio_movilizacion) ?? 0,
      auxilio_alimentacion: cleanNumber(rawForm.auxilio_alimentacion) ?? 0,
      auxilio_vivienda: cleanNumber(rawForm.auxilio_vivienda) ?? 0,
    };
  };

  const formatApiError = (e: any, defaultMsg: string): string => {
    const detail = e?.response?.data?.detail;
    if (!detail) return defaultMsg;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((err: any) => {
        const field = err.loc && err.loc.length > 1 ? err.loc[err.loc.length - 1] : 'Campo';
        return `${field}: ${err.msg}`;
      }).join(' | ');
    }
    return defaultMsg;
  };

  const guardarBorrador = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const cleanPayload = cleanFormPayload(form);
      const req = await api.guardarBorrador(
        cleanPayload as any, correoSolicitante, nombreSolicitante, requisicionIdRef.current
      );
      requisicionIdRef.current = req.id;
      setRequisicionId(req.id);
      return true;
    } catch (e: any) {
      setError(formatApiError(e, 'Error al guardar borrador'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [form, correoSolicitante, nombreSolicitante]);

  const validarPaso = useCallback((paso: number): boolean => {
    switch (paso) {
      case 1:
        // Datos generales
        if (!(
          form.departamento &&
          form.municipio &&
          form.nombre_obra_proyecto?.trim() &&
          form.numero_personas_requeridas >= 1 &&
          form.tsa &&
          form.duracion_obra_contrato &&
          form.fecha_probable_ingreso &&
          form.centro_costo?.trim()
        )) return false;

        // Área y Cargo
        if (!(form.area_id && form.cargo_id)) return false;

        // Causal
        if (!form.causal_requisicion) return false;
        if (form.causal_requisicion === 'OTRO' && !form.otra_causal?.trim()) return false;
        if (!form.aprobador_id) return false;

        // Requisitos
        if (form.necesita_equipos_oficina === 'SI' && form.equipos_oficina.length === 0) return false;
        if (form.necesita_equipos_tecnologicos === 'SI' && form.equipos_tecnologicos.length === 0) return false;
        if (form.requiere_simcard === 'SI' && !form.tipo_plan_simcard) return false;
        if (form.requiere_programas_especiales === 'SI' && !form.programas_especiales?.trim()) return false;

        // Contratación
        if (!(
          form.salario_asignado?.trim() &&
          form.horas_extras &&
          form.modalidad_contratacion &&
          form.tipo_contratacion
        )) return false;

        return true;
      default:
        return true;
    }
  }, [form]);

  const siguiente = useCallback(async () => {
    setError(null);
    if (!validarPaso(pasoActual)) {
      setError('Por favor diligencie todos los campos obligatorios del paso actual.');
      return;
    }
    if (pasoActual < totalPasos) {
      setPasoActual(p => p + 1);
      try {
        const cleanPayload = cleanFormPayload(form);
        const req = await api.guardarBorrador(
          cleanPayload as any, correoSolicitante, nombreSolicitante, requisicionIdRef.current
        );
        requisicionIdRef.current = req.id;
        setRequisicionId(req.id);
      } catch (e) {
        console.warn('Error al auto-guardar borrador:', e);
      }
    }
  }, [pasoActual, totalPasos, form, correoSolicitante, nombreSolicitante, validarPaso]);

  const anterior = useCallback(() => {
    if (pasoActual > 1) setPasoActual(p => p - 1);
  }, [pasoActual]);

  const enviarAAprobacion = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // 1. Guardar la versión más reciente del formulario primero
      const cleanPayload = cleanFormPayload(form);
      const req = await api.guardarBorrador(
        cleanPayload as any, correoSolicitante, nombreSolicitante, requisicionIdRef.current
      );
      const activeId = req.id;
      requisicionIdRef.current = activeId;
      setRequisicionId(activeId);

      // 2. Enviar a aprobación con el ID correspondiente
      await api.enviarAAprobacion(activeId, correoSolicitante, nombreSolicitante);
      return true;
    } catch (e: any) {
      setError(formatApiError(e, 'Error al enviar a aprobación'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [form, correoSolicitante, nombreSolicitante]);

  const cargarRequisicion = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const req = await api.getDetalleRequisicion(id);
      requisicionIdRef.current = id;
      setRequisicionId(id);
      setForm({
        departamento: req.departamento || '',
        municipio: req.municipio || '',
        ot: req.ot || '',
        nombre_obra_proyecto: req.nombre_obra_proyecto || '',
        direccion_obra_proyecto: req.direccion_obra_proyecto || '',
        encargado_sitio: req.encargado_sitio || '',
        numero_personas_requeridas: req.numero_personas_requeridas || 1,
        tsa: req.tsa || '',
        duracion_obra_contrato: req.duracion_obra_contrato || '',
        fecha_probable_ingreso: req.fecha_probable_ingreso || '',
        centro_costo: req.centro_costo || '',
        perfil_requerido: req.perfil_requerido || '',
        area_id: req.area_id,
        cargo_id: req.cargo_id,
        causal_requisicion: req.causal_requisicion || '',
        otra_causal: req.otra_causal || '',
        aprobador_id: req.aprobador_id ?? null,
        necesita_equipos_oficina: (req.necesita_equipos_oficina as 'SI' | 'NO') || 'NO',
        equipos_oficina: req.equipos_oficina?.map(e => e.equipo) || [],
        necesita_equipos_tecnologicos: (req.necesita_equipos_tecnologicos as 'SI' | 'NO') || 'NO',
        equipos_tecnologicos: req.equipos_tecnologicos?.map(e => e.equipo) || [],
        requiere_simcard: (req.requiere_simcard as 'SI' | 'NO') || 'NO',
        tipo_plan_simcard: req.tipo_plan_simcard || '',
        requiere_programas_especiales: (req.requiere_programas_especiales as 'SI' | 'NO') || 'NO',
        programas_especiales: req.programas_especiales || '',
        salario_asignado: formatThousands(req.salario_asignado),
        horas_extras: (req.horas_extras as 'SI' | 'NO') || 'NO',
        modalidad_contratacion: req.modalidad_contratacion || '',
        tipo_contratacion: req.tipo_contratacion || '',
        auxilio_movilizacion: formatThousands(req.auxilio_movilizacion ?? 0),
        auxilio_alimentacion: formatThousands(req.auxilio_alimentacion ?? 0),
        auxilio_vivienda: formatThousands(req.auxilio_vivienda ?? 0),
        confirmacion: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    pasoActual, totalPasos, form, loading, error, requisicionId,
    updateField, irAPaso, siguiente, anterior,
    guardarBorrador, enviarAAprobacion, cargarRequisicion,
  };
}
