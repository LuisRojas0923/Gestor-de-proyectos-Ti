// Paso 3: Causal de la Requisición
import React from 'react';
import { AlertTriangle, UserCheck } from 'lucide-react';
import { Select, Title, Text } from '../../../../../../components/atoms';
import { TextAreaField } from '../../../Common';
import type { FormularioRP, AprobadorRP } from '../../types/requisicion.types';

const CAUSALES = [
  { value: '', label: 'SELECCIONAR CAUSAL...' },
  { value: 'CREACIÓN DE UN NUEVO CARGO', label: 'CREACIÓN DE UN NUEVO CARGO' },
  { value: 'INCREMENTO OBRA / LABOR', label: 'INCREMENTO OBRA / LABOR' },
  { value: 'REEMPLAZO POR INCAPACIDAD ARL', label: 'REEMPLAZO POR INCAPACIDAD ARL' },
  { value: 'REEMPLAZO POR RETIRO VOLUNTARIO', label: 'REEMPLAZO POR RETIRO VOLUNTARIO' },
  { value: 'REEMPLAZO POR MATERNIDAD', label: 'REEMPLAZO POR MATERNIDAD' },
  { value: 'REEMPLAZO POR INCAPACIDAD EPS', label: 'REEMPLAZO POR INCAPACIDAD EPS' },
  { value: 'TERMINACIÓN DEL CONTRATO', label: 'TERMINACIÓN DEL CONTRATO' },
  { value: 'REEMPLAZO POR VACACIONES', label: 'REEMPLAZO POR VACACIONES' },
  { value: 'OTRO', label: 'OTRO (ESPECIFICAR)' },
];

interface Props {
  form: FormularioRP;
  update: <K extends keyof FormularioRP>(k: K, v: FormularioRP[K]) => void;
  aprobadores: AprobadorRP[];
}

const Step3Causal: React.FC<Props> = ({ form, update, aprobadores }) => {
  // Filtra directores del área seleccionada en el Paso 2
  const directoresDelArea = aprobadores.filter(
    a => a.activo && a.area_id === form.area_id
  );

  const opcionesDirector = [
    { value: '', label: 'SELECCIONAR DIRECTOR...' },
    ...directoresDelArea.map(a => ({
      value: String(a.id),
      label: `${a.nombre_aprobador.toUpperCase()} — ${a.email_aprobador.toUpperCase()}`,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="md:col-span-2">
          <Select
            label="Causal de requisición"
            name="causal_requisicion"
            value={form.causal_requisicion}
            onChange={e => update('causal_requisicion', e.target.value)}
            options={CAUSALES}
            required
          />
        </div>

        {form.causal_requisicion === 'OTRO' && (
          <div className="md:col-span-2">
            <TextAreaField
              label="Especifique la causal"
              name="otra_causal"
              value={form.otra_causal}
              onChange={e => update('otra_causal', e.target.value)}
              placeholder="Describa detalladamente el motivo de la requisición..."
              rows={2}
              isRequired
            />
          </div>
        )}

        <div className="md:col-span-2">

        {!form.area_id ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Text size="sm" className="text-amber-700">
              Debe seleccionar un <strong>Área</strong> en el Paso 2 para ver los directores disponibles.
            </Text>
          </div>
        ) : directoresDelArea.length === 0 ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <Text size="sm" className="text-red-700">
              No hay directores configurados para el área seleccionada. Contacte al administrador.
            </Text>
          </div>
        ) : (
          <>
            <Select
              label="Director que aprobará la requisición"
              name="aprobador_id"
              value={form.aprobador_id ? String(form.aprobador_id) : ''}
              onChange={e => update('aprobador_id', e.target.value ? Number(e.target.value) : null)}
              options={opcionesDirector}
              required
            />
            <Text size="xs" color="secondary">
              Este director recibirá la solicitud por correo electrónico para su aprobación.
            </Text>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default Step3Causal;
