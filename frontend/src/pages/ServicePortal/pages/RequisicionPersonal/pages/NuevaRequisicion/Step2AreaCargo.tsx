// Paso 2: Área y Cargo Solicitado (dinámico desde BD)
import React, { useEffect, useState } from 'react';
import { Layers, Briefcase } from 'lucide-react';
import { Select, Text, Title } from '../../../../../../components/atoms';
import type { FormularioRP } from '../../types/requisicion.types';
import type { AreaRP, CargoRP } from '../../types/requisicion.types';
import { getAreas, getCargos } from '../../services/requisicionService';

interface Props {
  form: FormularioRP;
  update: <K extends keyof FormularioRP>(k: K, v: FormularioRP[K]) => void;
}

const Step2AreaCargo: React.FC<Props> = ({ form, update }) => {
  const [areas, setAreas] = useState<AreaRP[]>([]);
  const [cargos, setCargos] = useState<CargoRP[]>([]);
  const [loadingCargos, setLoadingCargos] = useState(false);

  useEffect(() => {
    getAreas().then(setAreas).catch(() => {});
  }, []);

  const prevAreaIdRef = React.useRef<number | null>(form.area_id);

  useEffect(() => {
    if (form.area_id) {
      setLoadingCargos(true);
      if (prevAreaIdRef.current !== form.area_id) {
        update('cargo_id', null);
        prevAreaIdRef.current = form.area_id;
      }
      getCargos(form.area_id)
        .then(setCargos)
        .catch(() => {})
        .finally(() => setLoadingCargos(false));
    } else {
      setCargos([]);
      if (prevAreaIdRef.current !== null) {
        update('cargo_id', null);
        prevAreaIdRef.current = null;
      }
    }
  }, [form.area_id]);

  const areaOptions = [
    { value: '', label: 'SELECCIONAR ÁREA...' },
    ...areas.map(a => ({ value: String(a.id), label: a.nombre })),
  ];

  const cargoOptions = [
    { value: '', label: loadingCargos ? 'CARGANDO CARGOS...' : 'SELECCIONAR CARGO...' },
    ...cargos.map(c => ({ value: String(c.id), label: c.nombre.toUpperCase() })),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="md:col-span-2">
        <Select
          label="Área"
          name="area_id"
          value={form.area_id ? String(form.area_id) : ''}
          onChange={e => update('area_id', e.target.value ? Number(e.target.value) : null)}
          icon={Layers}
          options={areaOptions}
          required
        />
        </div>
        <div className="md:col-span-2">
          <Select
          label="Cargo solicitado"
          name="cargo_id"
          value={form.cargo_id ? String(form.cargo_id) : ''}
          onChange={e => update('cargo_id', e.target.value ? Number(e.target.value) : null)}
          icon={Briefcase}
          options={cargoOptions}
          disabled={!form.area_id || loadingCargos}
          required
        />
        </div>
      </div>

      {!form.area_id && (
        <Text as="p" className="text-sm text-[var(--color-text-secondary)] italic">
          Seleccione primero un área para cargar los cargos disponibles.
        </Text>
      )}
    </div>
  );
};

export default Step2AreaCargo;
