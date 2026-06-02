// Paso 4: Requisitos del nuevo colaborador
import React from 'react';
import { Monitor, Smartphone, Package, Code } from 'lucide-react';
import { Input, Select, Text, Title } from '../../../../../../components/atoms';
import { TextAreaField } from '../../../Common';
import type { FormularioRP } from '../../types/requisicion.types';

const EQUIPOS_OFICINA = ['ESCRITORIO', 'LOCKER', 'SILLA', 'ARCHIVADOR', 'MÓDULO / OFICINA'];
const EQUIPOS_TEC = ['EQUIPO DE CÓMPUTO DESKTOP', 'EQUIPO DE CÓMPUTO PORTÁTIL', 'CORREO CORPORATIVO', 'USUARIO DE RED', 'EXT: PANTALLA, MOUSE, TECLADO'];
const PLANES_SIMCARD = [
  { value: '', label: 'SELECCIONAR PLAN...' },
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

const Step4Requisitos: React.FC<Props> = ({ form, update }) => (
  <div className="space-y-8">
    {/* Equipos de oficina */}
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border)]">
        <Package className="w-5 h-5 text-[var(--color-primary)]" />
        <Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Equipos de Oficina</Title>
      </div>
      <SiNoSelect label="¿Necesita equipos de oficina?" name="necesita_equipos_oficina"
        value={form.necesita_equipos_oficina}
        onChange={v => { update('necesita_equipos_oficina', v); if (v === 'NO') update('equipos_oficina', []); }}
        icon={Package}
      />
      {form.necesita_equipos_oficina === 'SI' && (
        <CheckGroup options={EQUIPOS_OFICINA} selected={form.equipos_oficina}
          onChange={v => update('equipos_oficina', v)} />
      )}
    </div>

    {/* Equipos tecnológicos */}
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border)]">
        <Monitor className="w-5 h-5 text-[var(--color-primary)]" />
        <Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Equipos Tecnológicos</Title>
      </div>
      <SiNoSelect label="¿Necesita equipos tecnológicos?" name="necesita_equipos_tecnologicos"
        value={form.necesita_equipos_tecnologicos}
        onChange={v => { update('necesita_equipos_tecnologicos', v); if (v === 'NO') update('equipos_tecnologicos', []); }}
        icon={Monitor}
      />
      {form.necesita_equipos_tecnologicos === 'SI' && (
        <CheckGroup options={EQUIPOS_TEC} selected={form.equipos_tecnologicos}
          onChange={v => update('equipos_tecnologicos', v)} />
      )}
    </div>

    {/* SIMCARD */}
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border)]">
        <Smartphone className="w-5 h-5 text-[var(--color-primary)]" />
        <Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">SIMCARD</Title>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SiNoSelect label="¿Requiere SIMCARD?" name="requiere_simcard"
          value={form.requiere_simcard}
          onChange={v => { update('requiere_simcard', v); if (v === 'NO') update('tipo_plan_simcard', ''); }}
          icon={Smartphone}
        />
        {form.requiere_simcard === 'SI' && (
          <Select label="Tipo de plan SIMCARD" name="tipo_plan_simcard"
            value={form.tipo_plan_simcard}
            onChange={e => update('tipo_plan_simcard', e.target.value)}
            options={PLANES_SIMCARD}
            required
          />
        )}
      </div>
    </div>

    {/* Programas especiales */}
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border)]">
        <Code className="w-5 h-5 text-[var(--color-primary)]" />
        <Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Programas Especiales</Title>
      </div>
      <SiNoSelect label="¿Requiere programas especiales?" name="requiere_programas_especiales"
        value={form.requiere_programas_especiales}
        onChange={v => { update('requiere_programas_especiales', v); if (v === 'NO') update('programas_especiales', ''); }}
        icon={Code}
      />
      {form.requiere_programas_especiales === 'SI' && (
        <TextAreaField label="¿Cuáles programas?" name="programas_especiales"
          value={form.programas_especiales}
          onChange={e => update('programas_especiales', e.target.value)}
          placeholder="Ej: AutoCAD, SAP, Adobe Suite, etc."
          rows={3} isRequired
        />
      )}
    </div>
  </div>
);

export default Step4Requisitos;
