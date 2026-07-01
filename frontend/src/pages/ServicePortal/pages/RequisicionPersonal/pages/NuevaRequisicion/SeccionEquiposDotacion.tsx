import React from 'react';
import { Monitor, Smartphone, Package, Code } from 'lucide-react';
import { Input, Select, Text } from '../../../../../../components/atoms';
import { TextAreaField } from '../../../Common';
import type { FormularioRP } from '../../types/requisicion.types';

const EQUIPOS_OFICINA = ['ESCRITORIO', 'LOCKER', 'SILLA', 'ARCHIVADOR', 'MÓDULO / OFICINA'];
const EQUIPOS_TEC = ['PC DE ESCRITORIO', 'PC PORTATIL', 'CORREO CORPORATIVO', 'USUARIO DE RED', 'EXT: PANTALLA, MOUSE, TECLADO'];
const PLANES_SIMCARD = [
  { value: 'PLAN BÁSICO', label: 'PLAN BÁSICO' },
  { value: 'PLAN MEDIO', label: 'PLAN MEDIO' },
  { value: 'PLAN ALTO', label: 'PLAN ALTO' },
];

interface Props {
  form: FormularioRP;
  update: <K extends keyof FormularioRP>(k: K, v: FormularioRP[K]) => void;
}

const CheckGroup: React.FC<{
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}> = ({ options, selected, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {options.map(opt => {
      const checked = selected.includes(opt);
      return (
        <Text as="label" key={opt}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
            ${checked
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'}`}
        >
          <Input
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={() => {
              onChange(checked ? selected.filter(s => s !== opt) : [...selected, opt]);
            }}
          />
          <Text as="span" className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
            ${checked ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)]'}`}>
            {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </Text>
          <Text as="span" className="text-sm font-medium">{opt}</Text>
        </Text>
      );
    })}
  </div>
);

const SiNoSelect: React.FC<{
  label: string; name: string; value: 'SI' | 'NO';
  onChange: (v: 'SI' | 'NO') => void; icon?: React.ElementType;
}> = ({ label, name, value, onChange, icon }) => (
  <Select
    label={label} name={name} value={value} icon={icon}
    onChange={e => onChange(e.target.value as 'SI' | 'NO')}
    options={[{ value: 'NO', label: 'NO' }, { value: 'SI', label: 'SÍ' }]}
    required
  />
);

const RadioCheckGroup = ({
  label, name, value, onChange, options, required, labelHint
}: {
  label: string;
  name: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  required?: boolean;
  labelHint?: string;
}) => {
  return (
    <div className="flex flex-col gap-1.5 h-full justify-start mt-2">
      <label className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
        {labelHint && <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1 truncate" title={labelHint}>{labelHint}</span>}
      </label>
      <div className="flex flex-col gap-3 mt-1">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <label
              key={opt.value}
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => onChange(opt.value)}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isSelected 
                  ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' 
                  : 'bg-white border-slate-300 dark:border-slate-600 group-hover:border-[var(--color-primary)]'
              }`}>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm font-medium transition-colors ${isSelected ? 'text-[var(--color-text-primary)]' : 'text-slate-600 dark:text-slate-400 group-hover:text-[var(--color-text-primary)]'}`}>
                {opt.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export const SeccionEquiposDotacion: React.FC<Props> = ({ form, update }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
    <div className="space-y-4 w-full">
      <SiNoSelect label="¿Equipos de oficina?" name="necesita_equipos_oficina"
        value={form.necesita_equipos_oficina}
        onChange={v => { update('necesita_equipos_oficina', v); if (v === 'NO') update('equipos_oficina', []); }}
        icon={Package}
      />
      {form.necesita_equipos_oficina === 'SI' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckGroup options={EQUIPOS_OFICINA} selected={form.equipos_oficina}
            onChange={v => update('equipos_oficina', v)} />
        </div>
      )}
    </div>

    <div className="space-y-4 w-full">
      <SiNoSelect label="¿Equipos tecnológicos?" name="necesita_equipos_tecnologicos"
        value={form.necesita_equipos_tecnologicos}
        onChange={v => { update('necesita_equipos_tecnologicos', v); if (v === 'NO') update('equipos_tecnologicos', []); }}
        icon={Monitor}
      />
      {form.necesita_equipos_tecnologicos === 'SI' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckGroup options={EQUIPOS_TEC} selected={form.equipos_tecnologicos}
            onChange={v => update('equipos_tecnologicos', v)} />
        </div>
      )}
    </div>

    <div className="space-y-4 w-full">
      <SiNoSelect label="¿Requiere SIMCARD?" name="requiere_simcard"
        value={form.requiere_simcard}
        onChange={v => { update('requiere_simcard', v); if (v === 'NO') update('tipo_plan_simcard', ''); }}
        icon={Smartphone}
      />
      {form.requiere_simcard === 'SI' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <RadioCheckGroup
            label="Tipo de plan"
            name="tipo_plan_simcard"
            value={form.tipo_plan_simcard}
            onChange={v => update('tipo_plan_simcard', v)}
            options={PLANES_SIMCARD}
            required
          />
        </div>
      )}
    </div>

    <div className="space-y-4 w-full">
      <SiNoSelect label="¿Requiere software especial?" name="requiere_programas_especiales"
        value={form.requiere_programas_especiales}
        onChange={v => { update('requiere_programas_especiales', v); if (v === 'NO') update('programas_especiales', ''); }}
        icon={Code}
      />
      {form.requiere_programas_especiales === 'SI' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <TextAreaField label="¿Cuáles?" name="programas_especiales"
            value={form.programas_especiales}
            onChange={e => update('programas_especiales', e.target.value)}
            placeholder="Ej: AutoCAD, SAP, Adobe..."
            rows={3} isRequired
          />
        </div>
      )}
    </div>
  </div>
);

export default SeccionEquiposDotacion;
