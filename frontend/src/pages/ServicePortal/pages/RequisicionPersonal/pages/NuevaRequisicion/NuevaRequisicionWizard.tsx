// Wizard de 6 pasos para Nueva Requisición de Personal
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Save, Send, CheckCircle2 } from 'lucide-react';
import { Button, Text, Title } from '../../../../../../components/atoms';
import { useRequisicionPersonal, PASOS } from '../../hooks/useRequisicionPersonal';
import Step1DatosGenerales from './Step1DatosGenerales';
import Step2AreaCargo from './Step2AreaCargo';
import Step3Causal from './Step3Causal';
import Step4Requisitos from './Step4Requisitos';
import Step5Contratacion from './Step5Contratacion';
import Step6Confirmacion from './Step6Confirmacion';
import { getAreas, getCargos, getAprobadores } from '../../services/requisicionService';
import type { AprobadorRP } from '../../types/requisicion.types';

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
    pasoActual, totalPasos, form, loading, error,
    updateField, siguiente, anterior, guardarBorrador, enviarAAprobacion, cargarRequisicion
  } = useRequisicionPersonal(correoSolicitante, nombreSolicitante, requisicionIdEditar);

  const [areaNombre, setAreaNombre] = useState('');
  const [cargoNombre, setCargoNombre] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [aprobadores, setAprobadores] = useState<AprobadorRP[]>([]);

  useEffect(() => {
    getAprobadores().then(setAprobadores).catch(() => {});
  }, []);

  // Cargar para edición
  useEffect(() => {
    if (requisicionIdEditar) cargarRequisicion(requisicionIdEditar);
  }, [requisicionIdEditar]);

  // Actualizar nombres desnormalizados para el resumen
  useEffect(() => {
    if (form.area_id) {
      getAreas().then(areas => {
        const a = areas.find(x => x.id === form.area_id);
        if (a) setAreaNombre(a.nombre);
      });
    }
  }, [form.area_id]);

  useEffect(() => {
    if (form.cargo_id && form.area_id) {
      getCargos(form.area_id).then(cargos => {
        const c = cargos.find(x => x.id === form.cargo_id);
        if (c) setCargoNombre(c.nombre.toUpperCase());
      });
    }
  }, [form.cargo_id, form.area_id]);



  const handleGuardarBorrador = async () => {
    const ok = await guardarBorrador();
    if (ok) onSuccess('borrador');
  };

  const handleEnviar = async () => {
    if (!form.confirmacion) return;
    const ok = await enviarAAprobacion();
    if (ok) { setEnviado(true); setTimeout(() => onSuccess('enviada'), 1800); }
  };

  const renderPaso = () => {
    const props = { form, update: updateField };
    switch (pasoActual) {
      case 1: return (
        <div className="space-y-6">
          <Step1DatosGenerales {...props} correoSolicitante={correoSolicitante} nombreSolicitante={nombreSolicitante} />
          <Step2AreaCargo {...props} />
          <Step3Causal {...props} aprobadores={aprobadores} />
          <Step4Requisitos {...props} />
          <Step5Contratacion {...props} />
        </div>
      );
      case 2: return <Step6Confirmacion {...props} nombreSolicitante={nombreSolicitante} correoSolicitante={correoSolicitante} areaNombre={areaNombre} cargoNombre={cargoNombre} />;
      default: return null;
    }
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-4">
        <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl" />
        <div>
          <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            {requisicionIdEditar ? 'Editar Requisición de Personal' : 'Nueva Requisición de Personal'}
          </Title>
          <Text variant="caption" color="text-secondary" className="block text-[10px] leading-none uppercase tracking-widest opacity-70 mt-1">
            RECURSOS HUMANOS / SOLICITUD DE PERSONAL
          </Text>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
        <div className="flex items-center justify-between overflow-x-auto gap-2">
          {PASOS.map((paso, idx) => {
            const activo = paso.id === pasoActual;
            const completado = paso.id < pasoActual;
            return (
              <div key={paso.id} className="flex items-center gap-2 flex-shrink-0">
                <div className={`flex items-center gap-2 ${activo ? 'text-[var(--color-primary)]' : completado ? 'text-emerald-600' : 'text-[var(--color-text-tertiary)]'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                    ${activo ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                    : completado ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-[var(--color-border)]'}`}>
                    {completado ? '✓' : paso.id}
                  </div>
                  <Text as="span" className="text-xs font-semibold hidden sm:block">{paso.titulo}</Text>
                </div>
                {idx < PASOS.length - 1 && (
                  <div className={`h-0.5 w-6 flex-shrink-0 ${completado ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2">
          <Text variant="caption" color="secondary">{PASOS[pasoActual - 1]?.descripcion}</Text>
        </div>
      </div>

      {/* Contenido del paso */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 min-h-[400px]">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {renderPaso()}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3">
          {pasoActual > 1 && (
            <Button variant="secondary" onClick={anterior} icon={ArrowLeft} disabled={loading}>
              Anterior
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleGuardarBorrador}
            icon={Save}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar borrador'}
          </Button>

          {pasoActual < totalPasos ? (
            <Button
              variant="primary"
              onClick={siguiente}
              icon={ArrowRight}
              iconPosition="right"
              disabled={loading}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleEnviar}
              icon={Send}
              iconPosition="right"
              disabled={loading || !form.confirmacion}
            >
              {loading ? 'Enviando...' : 'Enviar a aprobación'}
            </Button>
          )}
        </div>
      </div>

      {/* Progreso */}
      <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
          style={{ width: `${(pasoActual / totalPasos) * 100}%` }} /* [CONTROLADO] */
        />
      </div>
    </div>
  );
};

export default NuevaRequisicionWizard;
