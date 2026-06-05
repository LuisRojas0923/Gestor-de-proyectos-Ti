// Paso 5: Condiciones de Contratación
import React from 'react';
import { DollarSign, FileText, Clock } from 'lucide-react';
import { Select, Title } from '../../../../../../components/atoms';
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

const Step5Contratacion: React.FC<Props> = ({ form, update, isModificacionSalarial }) => {
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="md:col-span-1">
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
        </div>
        <div className="md:col-span-1 md:col-start-3">
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

      {/* Modalidad y tipo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
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
        <div className="md:col-span-1 md:col-start-3">
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

      {/* Auxilios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-1">
              <FormField
                label="Movilización"
                name="auxilio_movilizacion"
                type="text"
                value={form.auxilio_movilizacion}
                onChange={e => handleNumericChange('auxilio_movilizacion', e.target.value)}
                icon={DollarSign}
                placeholder="0"
              />
            </div>
          </div>
        </div>
        <div className="md:col-span-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-1">
              <FormField
                label="Alimentación"
                name="auxilio_alimentacion"
                type="text"
                value={form.auxilio_alimentacion}
                onChange={e => handleNumericChange('auxilio_alimentacion', e.target.value)}
                icon={DollarSign}
                placeholder="0"
              />
            </div>
          </div>
        </div>
        <div className="md:col-span-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-1">
              <FormField
                label="Vivienda"
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
      </div>
    </div>
  );
};

export default Step5Contratacion;
