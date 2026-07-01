import React from 'react';
import { CheckCircle2, User, MapPin, Briefcase, DollarSign, Package, Layers } from 'lucide-react';
import { Title, Text, Input, Button } from '../../../../../../components/atoms';
import type { FormularioRP } from '../../types/requisicion.types';

interface Props {
  form: FormularioRP;
  update: <K extends keyof FormularioRP>(k: K, v: FormularioRP[K]) => void;
  nombreSolicitante: string;
  correoSolicitante: string;
  areaNombre: string;
  cargoNombre: string;
  aprobadorNombre: string;
}

const SummaryItem = ({ label, value, highlight = false }: { label: string; value: string | number | string[]; highlight?: boolean }) => {
  const displayValue = Array.isArray(value) ? value.join(', ') : value;
  
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30' : 'bg-slate-50 dark:bg-neutral-800/50'}`}>
      <Text variant="caption" className="text-slate-500 dark:text-slate-400 font-medium mb-1 block uppercase text-[10px] tracking-wider">{label}</Text>
      <Text variant="body2" className={`font-semibold ${highlight ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
        {displayValue || <span className="text-slate-400 italic font-normal">No especificado</span>}
      </Text>
    </div>
  );
};

export const SeccionResumenConfirmacion: React.FC<Props> = ({
  form, update, nombreSolicitante, correoSolicitante, areaNombre, cargoNombre, aprobadorNombre
}) => {
  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        
        {/* BLOQUE 1: DATOS GENERALES */}
        <div className="bg-white dark:bg-neutral-900 border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-neutral-800/80 px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
            <Title variant="subtitle2" weight="bold">Datos Generales y Ubicación</Title>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <SummaryItem label="Solicitante" value={nombreSolicitante} />
            <SummaryItem label="Correo" value={correoSolicitante} />
            <SummaryItem label="Ubicación" value={`${form.municipio}, ${form.departamento}`} />
            <SummaryItem label="Orden de Trabajo (OT)" value={form.ot} />
            <SummaryItem label="Nombre Obra / Proyecto" value={form.nombre_obra_proyecto} />
            <SummaryItem label="Dirección Obra" value={form.direccion_obra_proyecto} />
            <SummaryItem label="Encargado en sitio" value={form.encargado_sitio} />
            <SummaryItem label="N° Personas" value={form.numero_personas_requeridas} />
            <SummaryItem label="TSA" value={form.tsa} />
            <SummaryItem label="Duración" value={form.duracion_obra_contrato} />
            <div className="col-span-2">
              <SummaryItem label="Fecha probable de ingreso" value={form.fecha_probable_ingreso} />
            </div>
          </div>
        </div>

        {/* BLOQUE 2: ÁREA, CARGO Y PERFIL */}
        <div className="bg-white dark:bg-neutral-900 border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-neutral-800/80 px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--color-primary)]" />
            <Title variant="subtitle2" weight="bold">Área, Cargo y Aprobación</Title>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <SummaryItem label="Centro de costo" value={form.centro_costo} />
            </div>
            <SummaryItem label="Área" value={areaNombre} />
            <SummaryItem label="Cargo Solicitado" value={cargoNombre} />
            <SummaryItem label="Causal de Requisición" value={form.causal_requisicion} />
            {form.causal_requisicion === 'OTRO' && (
              <SummaryItem label="Otra causal" value={form.otra_causal} />
            )}
            <div className="col-span-2">
              <SummaryItem label="Director Aprobador" value={aprobadorNombre} />
            </div>
            <div className="col-span-2">
              <SummaryItem label="Perfil Requerido" value={form.perfil_requerido} />
            </div>
          </div>
        </div>

        {/* BLOQUE 3: CONTRATACIÓN Y AUXILIOS */}
        <div className="bg-white dark:bg-neutral-900 border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-neutral-800/80 px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[var(--color-primary)]" />
            <Title variant="subtitle2" weight="bold">Condiciones de Contratación y Auxilios</Title>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <SummaryItem label="Salario Asignado" value={`$ ${form.salario_asignado}`} />
            <SummaryItem label="¿Horas Extras?" value={form.horas_extras} />
            <SummaryItem label="Modalidad" value={form.modalidad_contratacion} />
            <SummaryItem label="Tipo de Contrato" value={form.tipo_contratacion} />
            <div className="col-span-2 grid grid-cols-3 gap-3 pt-2 border-t border-[var(--color-border)]">
              <SummaryItem label="Movilización" value={`$ ${form.auxilio_movilizacion}`} />
              <SummaryItem label="Alimentación" value={`$ ${form.auxilio_alimentacion}`} />
              <SummaryItem label="Vivienda" value={`$ ${form.auxilio_vivienda}`} />
            </div>
          </div>
        </div>

        {/* BLOQUE 4: EQUIPOS Y DOTACIÓN */}
        <div className="bg-white dark:bg-neutral-900 border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-neutral-800/80 px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
            <Package className="w-4 h-4 text-[var(--color-primary)]" />
            <Title variant="subtitle2" weight="bold">Equipos e Implementos</Title>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <SummaryItem label="Equipos de Oficina" value={form.necesita_equipos_oficina === 'SI' ? form.equipos_oficina : 'NO REQUERIDO'} />
            </div>
            <div className="col-span-2">
              <SummaryItem label="Equipos Tecnológicos" value={form.necesita_equipos_tecnologicos === 'SI' ? form.equipos_tecnologicos : 'NO REQUERIDO'} />
            </div>
            <SummaryItem label="SIMCARD" value={form.requiere_simcard === 'SI' ? form.tipo_plan_simcard : 'NO'} />
            <SummaryItem label="Programas Especiales" value={form.requiere_programas_especiales === 'SI' ? form.programas_especiales : 'NO'} />
          </div>
        </div>

      </div>

      {/* SECCIÓN CONFIRMACIÓN INTERACTIVA (MOVIDA ABAJO Y MÁS COMPACTA) */}
      <section className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 overflow-hidden shadow-sm mt-4">
        <div className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <Title variant="subtitle2" className="text-emerald-800 dark:text-emerald-400 font-bold mb-0.5 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Confirmación de datos
            </Title>
            <Text variant="caption" className="text-emerald-700 dark:text-emerald-500/80 leading-snug">
              Al marcar esta casilla, confirmas que has revisado el resumen de tu solicitud y das fe de que la información declarada es verídica y corresponde a las necesidades operativas.
            </Text>
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-2.5 cursor-pointer px-4 py-2.5 bg-white dark:bg-neutral-800 rounded-lg border border-emerald-200 shadow-sm hover:border-emerald-400 transition-colors">
              <Input
                type="checkbox"
                className="w-4 h-4 accent-emerald-600 rounded border-emerald-300"
                checked={form.confirmacion}
                onChange={e => update('confirmacion', e.target.checked)}
              />
              <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">DECLARO Y ACEPTO</span>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SeccionResumenConfirmacion;
