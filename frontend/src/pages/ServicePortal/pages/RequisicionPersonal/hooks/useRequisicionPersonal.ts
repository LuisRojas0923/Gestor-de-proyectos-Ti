import { useState, useCallback, useRef, useEffect } from 'react';
import { FORMULARIO_INICIAL, FormularioRP } from '../types/requisicion.types';
import * as api from '../services/requisicionService';

export function useRequisicionPersonal(
  correoSolicitante: string,
  nombreSolicitante: string,
  requisicionIdInicial?: number
) {
  const [form, setForm] = useState<FormularioRP>(FORMULARIO_INICIAL);
  const [requisicionId, setRequisicionId] = useState<number | undefined>(requisicionIdInicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requisicionIdRef = useRef<number | undefined>(requisicionIdInicial);

  useEffect(() => {
    requisicionIdRef.current = requisicionIdInicial;
    setRequisicionId(requisicionIdInicial);
  }, [requisicionIdInicial]);

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

  const validarFormulario = useCallback((): {valido: boolean, errores: string[]} => {
    const errores: string[] = [];

    // DATOS GENERALES Y UBICACIÓN
    if (!form.departamento) errores.push("Departamento");
    if (!form.municipio) errores.push("Municipio");
    if (!form.ot?.trim()) errores.push("OT (Orden de Trabajo)");
    if (!form.direccion_obra_proyecto?.trim()) errores.push("Dirección de obra o proyecto");
    if (!form.nombre_obra_proyecto?.trim()) errores.push("Nombre obra / proyecto");
    if (!form.encargado_sitio?.trim()) errores.push("Encargado en sitio");
    if (form.numero_personas_requeridas < 1) errores.push("N° personas requeridas (mínimo 1)");
    if (!form.tsa) errores.push("TSA");
    if (!form.duracion_obra_contrato?.trim()) errores.push("Duración");
    if (!form.fecha_probable_ingreso) errores.push("Fecha de ingreso");

    // ÁREA, CARGO Y PERFIL
    if (!form.centro_costo?.trim()) errores.push("Centro de costo");
    if (!form.area_id) errores.push("Área");
    if (!form.cargo_id) errores.push("Cargo solicitado");
    if (!form.causal_requisicion) errores.push("Causal de requisición");
    if (form.causal_requisicion === 'OTRO' && !form.otra_causal?.trim()) errores.push("Otra causal especificada");

    // EQUIPOS Y DOTACIÓN
    if (!form.necesita_equipos_oficina) errores.push("¿Necesita equipos de oficina?");
    if (form.necesita_equipos_oficina === 'SI' && form.equipos_oficina.length === 0) errores.push("Detalle de equipos de oficina");
    
    if (!form.requiere_simcard) errores.push("¿Requiere SIMCARD?");
    if (form.requiere_simcard === 'SI' && !form.tipo_plan_simcard?.trim()) errores.push("Tipo de plan SIMCARD");
    
    if (!form.necesita_equipos_tecnologicos) errores.push("¿Necesita equipos tecnológicos?");
    if (form.necesita_equipos_tecnologicos === 'SI' && form.equipos_tecnologicos.length === 0) errores.push("Detalle de equipos tecnológicos");
    
    if (!form.requiere_programas_especiales) errores.push("¿Requiere programas especiales?");
    if (form.requiere_programas_especiales === 'SI' && !form.programas_especiales?.trim()) errores.push("Detalle de programas especiales");

    // CONDICIONES DE CONTRATACIÓN
    if (!form.salario_asignado?.trim()) errores.push("Salario asignado (COP)");
    if (!form.horas_extras) errores.push("¿Tiene horas extras?");
    if (!form.modalidad_contratacion?.trim()) errores.push("Modalidad de contratación");
    if (!form.tipo_contratacion?.trim()) errores.push("Tipo de contratación");

    // AUXILIOS
    if (!form.auxilio_movilizacion?.trim()) errores.push("Movilización (Ingresa 0 si no aplica)");
    if (!form.auxilio_alimentacion?.trim()) errores.push("Alimentación (Ingresa 0 si no aplica)");
    if (!form.auxilio_vivienda?.trim()) errores.push("Vivienda (Ingresa 0 si no aplica)");

    if (!form.aprobador_id) errores.push("Aprobador de Área");

    return { valido: errores.length === 0, errores };
  }, [form]);

  const enviarAAprobacion = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const validacion = validarFormulario();
      if (!validacion.valido) {
        setError(`Faltan campos obligatorios: ${validacion.errores.join(', ')}`);
        setLoading(false);
        return false;
      }

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
  }, [form, correoSolicitante, nombreSolicitante, validarFormulario]);

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
        estado: req.estado,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    form, loading, error, requisicionId, setError,
    updateField, guardarBorrador, enviarAAprobacion, cargarRequisicion, validarFormulario
  };
}

