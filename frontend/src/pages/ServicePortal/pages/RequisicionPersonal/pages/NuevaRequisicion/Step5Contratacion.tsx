// Paso 5: Condiciones de Contratación
import React from 'react';
import { DollarSign, FileText, Clock } from 'lucide-react';
import { Select, Title } from '../../../../../../components/atoms';
import { FormField } from '../../../Common';
import type { FormularioRP } from '../../types/requisicion.types';

const MODALIDADES = [
  { value: '', label: 'Seleccionar modalidad...' },
  { value: 'DIRECTO POR REFRIDCOL', label: 'Directo por Refridcol' },
  { value: 'AGENCIA TEMPORAL', label: 'Agencia temporal' },
  { value: 'APRENDIZ CONVENIO SENA', label: 'Aprendiz convenio SENA' },
];

const TIPOS_CONTRATO = [
  { value: '', label: 'Seleccionar tipo...' },
  { value: 'CONTRATO FIJO INFERIOR A 1 AÑO', label: 'Contrato fijo inferior a 1 año' },
  { value: 'CONTRATO OBRA LABOR', label: 'Contrato obra labor' },
  { value: 'CONTRATO INDEFINIDO', label: 'Contrato indefinido' },
];

interface Props {
  form: FormularioRP;
  update: <K extends keyof FormularioRP>(k: K, v: FormularioRP[K]) => void;
}

const Step5Contratacion: React.FC<Props> = ({ form, update }) => {
  const handleNumericChange = (
    campo: 'salario_asignado' | 'auxilio_movilizacion' | 'auxilio_alimentacion' | 'auxilio_vivienda',
    rawValue: string
  ) => {
    const cleanValue = rawValue.replace(/\D/g, '');
    if (!cleanValue) {
      update(campo, campo === 'salario_asignado' ? '' : '0');
      return;
    }
    const formatted = Number(cleanValue).toLocaleString('de-DE');
    update(campo, formatted);
  };

  return (
    <div className="space-y-8">
      {/* Salario y horas extras */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border)]">
          <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
          <Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Compensación</Title>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            label="Salario asignado (COP)"
            name="salario_asignado"
            type="text"
            value={form.salario_asignado}
            onChange={e => handleNumericChange('salario_asignado', e.target.value)}
            placeholder="Ej: 2.500.000"
            icon={DollarSign}
            isRequired
          />
          <Select
            label="¿Tiene horas extras?"
            name="horas_extras"
            value={form.horas_extras}
            onChange={e => update('horas_extras', e.target.value as 'SI' | 'NO')}
            icon={Clock}
            options={[{ value: 'NO', label: 'NO' }, { value: 'SI', label: 'SÍ' }]}
            required
          />
        </div>
      </div>

      {/* Modalidad y tipo */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border)]">
          <FileText className="w-5 h-5 text-[var(--color-primary)]" />
          <Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Vinculación</Title>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Select
            label="Modalidad de contratación"
            name="modalidad_contratacion"
            value={form.modalidad_contratacion}
            onChange={e => update('modalidad_contratacion', e.target.value)}
            options={MODALIDADES}
            required
          />
          <Select
            label="Tipo de contratación"
            name="tipo_contratacion"
            value={form.tipo_contratacion}
            onChange={e => update('tipo_contratacion', e.target.value)}
            options={TIPOS_CONTRATO}
            required
          />
        </div>
      </div>

      {/* Auxilios */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border)]">
          <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
          <Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Auxilios (si no aplica, dejar en 0)</Title>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FormField
            label="Auxilio de movilización (COP)"
            name="auxilio_movilizacion"
            type="text"
            value={form.auxilio_movilizacion}
            onChange={e => handleNumericChange('auxilio_movilizacion', e.target.value)}
            icon={DollarSign}
            placeholder="0"
          />
          <FormField
            label="Auxilio de alimentación (COP)"
            name="auxilio_alimentacion"
            type="text"
            value={form.auxilio_alimentacion}
            onChange={e => handleNumericChange('auxilio_alimentacion', e.target.value)}
            icon={DollarSign}
            placeholder="0"
          />
          <FormField
            label="Auxilio de vivienda (COP)"
            name="auxilio_vivienda"
            type="text"
            value={form.auxilio_vivienda}
            onChange={e => handleNumericChange('auxilio_vivienda', e.target.value)}
            icon={DollarSign}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
};

export default Step5Contratacion;
