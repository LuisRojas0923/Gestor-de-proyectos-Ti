import React from 'react';
import { DollarSign } from 'lucide-react';
import { FormField } from '../../../Common';
import type { FormularioRP } from '../../types/requisicion.types';

interface Props {
  form: FormularioRP;
  update: <K extends keyof FormularioRP>(k: K, v: FormularioRP[K]) => void;
}

export const SeccionAuxilios: React.FC<Props> = ({ form, update }) => {
  const handleNumericChange = (
    campo: 'auxilio_movilizacion' | 'auxilio_alimentacion' | 'auxilio_vivienda',
    rawValue: string
  ) => {
    const cleanValue = rawValue.replace(/\D/g, '');
    if (!cleanValue) {
      update(campo, '0');
      return;
    }
    const formatted = Number(cleanValue).toLocaleString('de-DE');
    update(campo, formatted);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div className="md:col-span-1">
        <FormField
          label="Movilización"
          name="auxilio_movilizacion"
          type="text"
          value={form.auxilio_movilizacion}
          onChange={e => handleNumericChange('auxilio_movilizacion', e.target.value)}
          icon={DollarSign}
          placeholder="0"
          isRequired={true}
        />
      </div>
      <div className="md:col-span-1">
        <FormField
          label="Alimentación"
          name="auxilio_alimentacion"
          type="text"
          value={form.auxilio_alimentacion}
          onChange={e => handleNumericChange('auxilio_alimentacion', e.target.value)}
          icon={DollarSign}
          placeholder="0"
          isRequired={true}
        />
      </div>
      <div className="md:col-span-1">
        <FormField
          label="Vivienda"
          name="auxilio_vivienda"
          type="text"
          value={form.auxilio_vivienda}
          onChange={e => handleNumericChange('auxilio_vivienda', e.target.value)}
          icon={DollarSign}
          placeholder="0"
          isRequired={true}
        />
      </div>
    </div>
  );
};

export default SeccionAuxilios;
