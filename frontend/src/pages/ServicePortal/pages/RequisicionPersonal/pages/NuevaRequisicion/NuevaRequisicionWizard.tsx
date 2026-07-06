import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Save, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Text, Title, Input } from '../../../../../../components/atoms';
import { useRequisicionPersonal } from '../../hooks/useRequisicionPersonal';
import SeccionDatosGenerales from './SeccionDatosGenerales';
import SeccionAreaCargo from './SeccionAreaCargo';
import SeccionEquiposDotacion from './SeccionEquiposDotacion';
import SeccionCondicionesContratacion from './SeccionCondicionesContratacion';
import SeccionAuxilios from './SeccionAuxilios';
import SeccionResumenConfirmacion from './SeccionResumenConfirmacion';
import { getAreas, getCargos, getAprobadores } from '../../services/requisicionService';
import type { AprobadorRP, AreaRP, CargoRP } from '../../types/requisicion.types';

interface NuevaRequisicionWizardProps {
  correoSolicitante: string;
  nombreSolicitante: string;
  onSuccess: (modo: 'borrador' | 'enviada') => void;
  onBack: () => void;
  requisicionIdEditar?: number;
}

const NuevaRequisicionWizard: React.FC<NuevaRequisicionWizardProps> = ({
  correoSolicitante, nombreSolicitante, onSuccess, onBack, requisicionIdEditar
}) => {
  const {
    form, loading, error, setError,
    updateField, guardarBorrador, enviarAAprobacion, cargarRequisicion, validarFormulario
  } = useRequisicionPersonal(correoSolicitante, nombreSolicitante, requisicionIdEditar);

  const [pasoActual, setPasoActual] = useState(1);
  const [enviado, setEnviado] = useState(false);
  const [bloquearEnvio, setBloquearEnvio] = useState(false);
  const [aprobadores, setAprobadores] = useState<AprobadorRP[]>([]);

  // Nombres para el resumen
  const [areaNombre, setAreaNombre] = useState('');
  const [cargoNombre, setCargoNombre] = useState('');
  const [aprobadorNombre, setAprobadorNombre] = useState('');

  useEffect(() => {
    getAprobadores().then(setAprobadores).catch(() => {});
  }, []);

  useEffect(() => {
    if (requisicionIdEditar) cargarRequisicion(requisicionIdEditar);
  }, [requisicionIdEditar, cargarRequisicion]);

  // Actualizar nombres desnormalizados para el resumen
  useEffect(() => {
    if (form.area_id) {
      getAreas().then(areas => {
        const a = areas.find(x => x.id === form.area_id);
        if (a) setAreaNombre(a.nombre);
      });
    } else {
      setAreaNombre('');
    }
  }, [form.area_id]);

  useEffect(() => {
    if (form.cargo_id && form.area_id) {
      getCargos(form.area_id).then(cargos => {
        const c = cargos.find(x => x.id === form.cargo_id);
        if (c) setCargoNombre(c.nombre.toUpperCase());
      });
    } else {
      setCargoNombre('');
    }
  }, [form.cargo_id, form.area_id]);

  const [prevAprobadorId, setPrevAprobadorId] = useState(form.aprobador_id);
  const [prevAprobadores, setPrevAprobadores] = useState(aprobadores);

  if (form.aprobador_id !== prevAprobadorId || aprobadores !== prevAprobadores) {
    setPrevAprobadorId(form.aprobador_id);
    setPrevAprobadores(aprobadores);
    if (form.aprobador_id && aprobadores.length > 0) {
      const a = aprobadores.find(x => x.id === form.aprobador_id);
      if (a) setAprobadorNombre(`${a.nombre_aprobador.toUpperCase()} (${a.email_aprobador.toLowerCase()})`);
      else setAprobadorNombre('');
    } else {
      setAprobadorNombre('');
    }
  }

  const handleGuardarBorrador = async () => {
    const ok = await guardarBorrador();
    if (ok) onSuccess('borrador');
  };

  const handleSiguiente = () => {
    const validacion = validarFormulario();
    if (!validacion.valido) {
      setError(`Faltan campos obligatorios: ${validacion.errores.join(', ')}`);
      // Scroll to top to see error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError(null);
    setPasoActual(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAtras = () => {
    setPasoActual(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnviar = async () => {
    if (!form.confirmacion) {
      setError("Debe aceptar la declaración de veracidad marcando la casilla de confirmación.");
      return;
    }
    const ok = await enviarAAprobacion();
    if (ok) { setEnviado(true); setTimeout(() => onSuccess('enviada'), 1800); }
  };

  if (enviado) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
        <Title variant="h4" className="font-bold">¡Requisición enviada!</Title>
        <Text color="secondary">Redirigiendo a tus requisiciones...</Text>
      </div>
    );
  }

  const isModificacionSalarial = form.estado === 'DEVUELTA_MODIFICACION_SALARIAL';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4 sticky top-0 bg-[var(--color-background)] z-40 py-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={pasoActual === 1 ? onBack : handleAtras} icon={ArrowLeft} className="font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl" />
          <div>
            <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              {requisicionIdEditar ? 'Editar Requisición de Personal' : 'Nueva Requisición de Personal'}
            </Title>
            <Text variant="caption" color="text-secondary" className="block text-[10px] leading-none uppercase tracking-widest opacity-70 mt-1">
              RECURSOS HUMANOS / SOLICITUD DE PERSONAL
            </Text>
          </div>
        </div>
        
        {/* Stepper visual simple */}
        <div className="hidden sm:flex items-center gap-2 bg-[var(--color-surface)] px-4 py-2 rounded-full border border-[var(--color-border)]">
          <div className={`flex items-center gap-2 ${pasoActual === 1 ? 'text-[var(--color-primary)] font-bold' : 'text-emerald-600'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${pasoActual === 1 ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-emerald-500 bg-emerald-500 text-white'}`}>
              {pasoActual > 1 ? '✓' : '1'}
            </div>
            <Text as="span" color="inherit" className="text-xs">Formulario</Text>
          </div>
          <div className="w-8 h-[2px] bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className={`flex items-center gap-2 ${pasoActual === 2 ? 'text-[var(--color-primary)] font-bold' : 'text-slate-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${pasoActual === 2 ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-slate-300 dark:border-slate-600'}`}>
              2
            </div>
            <Text as="span" color="inherit" className="text-xs">Resumen</Text>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3 sticky top-20 z-40 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm font-medium whitespace-pre-line">
            {error}
          </div>
        </div>
      )}

      <style>{`
        .nueva-req-form .text-base { font-size: 14px !important; line-height: 20px !important; }
        .nueva-req-form .text-sm { font-size: 12px !important; line-height: 16px !important; }
        .nueva-req-form .text-xs { font-size: 10px !important; line-height: 14px !important; }
        .nueva-req-form .text-\\[11px\\] { font-size: 9px !important; }
        .nueva-req-form .text-\\[10px\\] { font-size: 8px !important; }
        .nueva-req-form .text-lg { font-size: 16px !important; }
      `}</style>

      <div className="nueva-req-form">
        {/* PASO 1: FORMULARIO */}
        {pasoActual === 1 && (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
          {isModificacionSalarial && (
            <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl flex items-center gap-2">
              <Text as="span" color="inherit" className="font-bold text-amber-900">Modificación Salarial:</Text>
              Solo puedes editar Salario, Movilización, Alimentación y Vivienda. Los demás campos están bloqueados.
            </div>
          )}

          {/* SECCIÓN 1 */}
          <section className={`bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-visible shadow-sm ${isModificacionSalarial ? "pointer-events-none opacity-60" : ""}`}>
            <div className="bg-slate-50 dark:bg-neutral-800/50 px-6 py-4 border-b border-[var(--color-border)] rounded-t-2xl">
              <Title variant="h6" className="text-[var(--color-primary)] flex items-center gap-2">
                <Text as="span" color="inherit" className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">1</Text>
                DATOS GENERALES Y UBICACIÓN
              </Title>
            </div>
            <div className="p-6">
              <SeccionDatosGenerales form={form} update={updateField} correoSolicitante={correoSolicitante} nombreSolicitante={nombreSolicitante} setBloquearEnvio={setBloquearEnvio} />
            </div>
          </section>

          {/* SECCIÓN 2 */}
          <section className={`bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-visible shadow-sm ${isModificacionSalarial ? "pointer-events-none opacity-60" : ""}`}>
            <div className="bg-slate-50 dark:bg-neutral-800/50 px-6 py-4 border-b border-[var(--color-border)] rounded-t-2xl">
              <Title variant="h6" className="text-[var(--color-primary)] flex items-center gap-2">
                <Text as="span" color="inherit" className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">2</Text>
                ÁREA, CARGO Y PERFIL
              </Title>
            </div>
            <div className="p-6">
              <SeccionAreaCargo form={form} update={updateField} aprobadores={aprobadores} />
            </div>
          </section>

          {/* SECCIÓN 3 */}
          <section className={`bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-visible shadow-sm ${isModificacionSalarial ? "pointer-events-none opacity-60" : ""}`}>
            <div className="bg-slate-50 dark:bg-neutral-800/50 px-6 py-4 border-b border-[var(--color-border)] rounded-t-2xl">
              <Title variant="h6" className="text-[var(--color-primary)] flex items-center gap-2">
                <Text as="span" color="inherit" className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">3</Text>
                EQUIPOS Y DOTACIÓN
              </Title>
            </div>
            <div className="p-6">
              <SeccionEquiposDotacion form={form} update={updateField} />
            </div>
          </section>

          {/* SECCIÓN 4 */}
          <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
            <div className="bg-slate-50 dark:bg-neutral-800/50 px-6 py-4 border-b border-[var(--color-border)]">
              <Title variant="h6" className="text-[var(--color-primary)] flex items-center gap-2">
                <Text as="span" color="inherit" className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">4</Text>
                CONDICIONES DE CONTRATACIÓN
              </Title>
            </div>
            <div className="p-6">
              <SeccionCondicionesContratacion form={form} update={updateField} isModificacionSalarial={isModificacionSalarial} />
            </div>
          </section>

          {/* SECCIÓN 5 */}
          <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
            <div className="bg-slate-50 dark:bg-neutral-800/50 px-6 py-4 border-b border-[var(--color-border)]">
              <Title variant="h6" className="text-[var(--color-primary)] flex items-center gap-2">
                <Text as="span" color="inherit" className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">5</Text>
                AUXILIOS
              </Title>
            </div>
            <div className="p-6">
              <SeccionAuxilios form={form} update={updateField} />
            </div>
          </section>
        </div>
      )}

      {/* PASO 2: RESUMEN Y CONFIRMACIÓN */}
      {pasoActual === 2 && (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <SeccionResumenConfirmacion
            form={form}
            update={updateField}
            nombreSolicitante={nombreSolicitante}
            correoSolicitante={correoSolicitante}
            areaNombre={areaNombre}
            cargoNombre={cargoNombre}
            aprobadorNombre={aprobadorNombre}
          />
        </div>
      )}

      {/* ACCIONES FINALES */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[var(--color-border)]">
        <Text variant="body2" color="secondary" className="italic">
          {pasoActual === 1 ? 'Asegúrese de diligenciar todos los campos obligatorios (*)' : 'Por favor verifique la información antes de enviar.'}
        </Text>

        <div className="flex gap-3 w-full sm:w-auto">
          {pasoActual === 1 ? (
            <>
              <Button
                variant="ghost"
                onClick={handleGuardarBorrador}
                icon={Save}
                disabled={loading}
                className="flex-1 sm:flex-none"
              >
                {loading ? 'Guardando...' : 'Guardar borrador'}
              </Button>

              <Button
                variant="primary"
                onClick={handleSiguiente}
                icon={ArrowRight}
                iconPosition="right"
                disabled={bloquearEnvio}
                className="flex-1 sm:flex-none px-8"
              >
                Siguiente
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={handleAtras}
                icon={ArrowLeft}
                disabled={loading}
                className="flex-1 sm:flex-none"
              >
                Modificar datos
              </Button>
              <Button
                variant="primary"
                onClick={handleEnviar}
                icon={Send}
                iconPosition="right"
                disabled={loading}
                className="flex-1 sm:flex-none px-8"
              >
                {loading ? 'Enviando...' : 'Enviar a aprobación'}
              </Button>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default NuevaRequisicionWizard;
