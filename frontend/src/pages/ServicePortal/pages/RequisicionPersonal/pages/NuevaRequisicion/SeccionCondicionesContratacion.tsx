import React from 'react';
import { DollarSign, Clock } from 'lucide-react';
import { Select } from '../../../../../../components/atoms';
import { FormField } from '../../../Common';
import type { FormularioRP } from '../../types/requisicion.types';

const MODALIDADES = [
  { value: '', label: 'SELECCIONAR MODALIDAD...' },
  { value: 'DIRECTO POR REFRIDCOL', label: 'DIRECTO POR REFRIDCOL' },
  { value: 'AGENCIA TEMPORAL', label: 'AGENCIA TEMPORAL' },
  { value: 'APRENDIZ CONVENIO SENA', label: 'APRENDIZ CONVENIO SENA' },
];

const TIPOS_CONTRATO = [
  { value: '', label: 'SELECCIONAR TIPO...' },
  { value: 'CONTRATO FIJO INFERIOR A 1 AÑO', label: 'CONTRATO FIJO INFERIOR A 1 AÑO' },
  { value: 'CONTRATO OBRA LABOR', label: 'CONTRATO OBRA LABOR' },
  { value: 'CONTRATO INDEFINIDO', label: 'CONTRATO INDEFINIDO' },
  { value: 'CONTRATO DE APRENDIZAJE', label: 'CONTRATO DE APRENDIZAJE' },
];

interface Props {
  form: FormularioRP;
  update: <K extends keyof FormularioRP>(k: K, v: FormularioRP[K]) => void;
  isModificacionSalarial?: boolean;
}

export const SeccionCondicionesContratacion: React.FC<Props> = ({ form, update, isModificacionSalarial }) => {
  const handleNumericChange = (campo: 'salario_asignado', rawValue: string) => {
    const cleanValue = rawValue.replace(/\D/g, '');
    if (!cleanValue) {
      update(campo, '');
      return;
    }
    const formatted = Number(cleanValue).toLocaleString('de-DE');
    update(campo, formatted);
  };

  const handleModalidadChange = (val: string) => {
    update('modalidad_contratacion', val);
    if (val === 'AGENCIA TEMPORAL') {
      update('tipo_contratacion', 'CONTRATO OBRA LABOR');
    } else if (val === 'APRENDIZ CONVENIO SENA') {
      update('tipo_contratacion', 'CONTRATO DE APRENDIZAJE');
    } else {
      update('tipo_contratacion', '');
    }
  };

  const isTipoContratoBloqueado = isModificacionSalarial || form.modalidad_contratacion === 'AGENCIA TEMPORAL' || form.modalidad_contratacion === 'APRENDIZ CONVENIO SENA';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-1">
          <FormField
            label="Salario asignado (COP)"
            name="salario_asignado"
            type="text"
            value={form.salario_asignado}
            onChange={e => handleNumericChange('salario_asignado', e.target.value)}
            placeholder="Ej: 2.500.000"
            icon={DollarSign}
            isRequired={true}
          />
        </div>
        <div className="md:col-span-1">
          <Select
            label="¿Tiene horas extras?"
            name="horas_extras"
            value={form.horas_extras}
            onChange={e => update('horas_extras', e.target.value as 'SI' | 'NO')}
            icon={Clock}
            options={[{ value: 'NO', label: 'NO' }, { value: 'SI', label: 'SÍ' }]}
            disabled={isModificacionSalarial}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-1">
          <Select
            label="Modalidad de contratación"
            name="modalidad_contratacion"
            value={form.modalidad_contratacion}
            onChange={e => handleModalidadChange(e.target.value)}
            options={MODALIDADES}
            disabled={isModificacionSalarial}
            required
          />
        </div>
        <div className="md:col-span-1">
          <Select
            label="Tipo de contratación"
            name="tipo_contratacion"
            value={form.tipo_contratacion}
            onChange={e => update('tipo_contratacion', e.target.value)}
            options={TIPOS_CONTRATO}
            disabled={isTipoContratoBloqueado}
            required
          />
        </div>
      </div>
    </div>
  );
};

export default SeccionCondicionesContratacion;
