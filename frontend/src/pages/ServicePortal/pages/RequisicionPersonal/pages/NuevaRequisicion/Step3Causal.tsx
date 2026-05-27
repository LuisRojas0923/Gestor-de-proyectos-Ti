// Paso 3: Causal de la Requisición
import React from 'react';
import { AlertTriangle, UserCheck } from 'lucide-react';
import { Select, Title, Text } from '../../../../../../components/atoms';
import { TextAreaField } from '../../../Common';
import type { FormularioRP, AprobadorRP } from '../../types/requisicion.types';

const CAUSALES = [
  { value: '', label: 'Seleccionar causal...' },
  { value: 'CREACIÓN DE UN NUEVO CARGO', label: 'Creación de un nuevo cargo' },
  { value: 'INCREMENTO OBRA / LABOR', label: 'Incremento obra / labor' },
  { value: 'REEMPLAZO POR INCAPACIDAD ARL', label: 'Reemplazo por incapacidad ARL' },
  { value: 'REEMPLAZO POR RETIRO VOLUNTARIO', label: 'Reemplazo por retiro voluntario' },
  { value: 'REEMPLAZO POR MATERNIDAD', label: 'Reemplazo por maternidad' },
  { value: 'REEMPLAZO POR INCAPACIDAD EPS', label: 'Reemplazo por incapacidad EPS' },
  { value: 'TERMINACIÓN DEL CONTRATO', label: 'Terminación del contrato' },
  { value: 'REEMPLAZO POR VACACIONES', label: 'Reemplazo por vacaciones' },
  { value: 'OTRO', label: 'Otro (especificar)' },
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
    { value: '', label: 'Seleccionar director...' },
    ...directoresDelArea.map(a => ({
      value: String(a.id),
      label: `${a.nombre_aprobador} — ${a.email_aprobador}`,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border)]">
        <AlertTriangle className="w-5 h-5 text-[var(--color-primary)]" />
        <Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Causal de la Requisición
        </Title>
      </div>

      <Select
        label="Causal de requisición"
        name="causal_requisicion"
        value={form.causal_requisicion}
        onChange={e => update('causal_requisicion', e.target.value)}
        options={CAUSALES}
        required
      />

      {form.causal_requisicion === 'OTRO' && (
        <TextAreaField
          label="Especifique la causal"
          name="otra_causal"
          value={form.otra_causal}
          onChange={e => update('otra_causal', e.target.value)}
          placeholder="Describa detalladamente el motivo de la requisición..."
          rows={4}
          isRequired
        />
      )}

      {/* Director a Cargo — condicional al área seleccionada */}
      <div className="border-t border-[var(--color-border)] pt-6 space-y-3">
        <div className="flex items-center gap-3 pb-1">
          <UserCheck className="w-5 h-5 text-[var(--color-primary)]" />
          <Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Director a Cargo
          </Title>
        </div>

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
  );
};

export default Step3Causal;
