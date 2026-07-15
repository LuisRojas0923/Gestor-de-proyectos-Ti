import { useEffect, useState } from 'react';
import { CalendarPlus, RefreshCw } from 'lucide-react';
import Button from '../../../../../components/atoms/Button';
import Select from '../../../../../components/atoms/Select';
import { Text } from '../../../../../components/atoms/Text';
import { listarPlantillas } from '../../../../../services/horariosRelacionesService';
import type { PlantillaHorario } from '../../../../../types/horariosRelaciones';

interface SelectorPlantillaPlanificadorProps {
  disabled: boolean;
  onAplicar: (plantilla: PlantillaHorario) => void;
}

const SelectorPlantillaPlanificador = ({ disabled, onAplicar }: SelectorPlantillaPlanificadorProps) => {
  const [plantillas, setPlantillas] = useState<PlantillaHorario[]>([]);
  const [seleccionadaId, setSeleccionadaId] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCargando(true);
    setError('');
    listarPlantillas({ incluir_inactivas: false, limit: 100, offset: 0 }, controller.signal)
      .then((response) => {
        setPlantillas(response.items);
        setSeleccionadaId((actual) => response.items.some((item) => item.id === actual) ? actual : '');
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las plantillas');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, [revision]);

  const seleccionada = plantillas.find((plantilla) => plantilla.id === seleccionadaId);
  const options = [
    { value: '', label: cargando ? 'Cargando...' : error ? 'Error al cargar' : plantillas.length ? 'Seleccionar...' : 'Sin plantillas' },
    ...plantillas.map((plantilla) => ({ value: plantilla.id, label: plantilla.nombre })),
  ];

  return (
    <div className="flex h-9 w-full min-w-0 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)]/35 px-2.5 shadow-inner">
      <Text className="shrink-0 !text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">Plantilla</Text>
      <Select
        value={seleccionadaId}
        options={options}
        ariaLabel="Plantilla de horario"
        size="xs"
        className="min-w-0 flex-1 [&_select]:!h-7 [&_select]:!rounded-lg [&_select]:!border-[var(--color-border)] [&_select]:!bg-[var(--color-surface)] [&_select]:!px-2 [&_select]:!text-[11px] [&_select]:!font-semibold [&_select]:!text-[var(--color-text-primary)] [&_select]:focus:!border-[var(--color-primary)] [&_select]:focus:!ring-1 [&_select]:focus:!ring-[var(--color-primary)]/25"
        onChange={(event) => setSeleccionadaId(event.target.value)}
      />
      <Button
        type="button"
        variant="custom"
        size="xs"
        aria-label={error ? 'Reintentar carga de plantillas' : 'Aplicar plantilla'}
        title={error || 'Aplicar la semana de la plantilla a los empleados seleccionados'}
        disabled={!error && (disabled || cargando || !seleccionada)}
        onClick={() => error ? setRevision((value) => value + 1) : seleccionada && onAplicar(seleccionada)}
        className="h-7 shrink-0 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 !px-2.5 !text-[10px] font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 disabled:border-[var(--color-border)] disabled:bg-[var(--color-surface)]/60 disabled:text-[var(--color-text-secondary)]"
      >
        {error ? <RefreshCw className="h-3 w-3" /> : <><CalendarPlus className="mr-1 h-3 w-3" />Aplicar</>}
      </Button>
    </div>
  );
};

export default SelectorPlantillaPlanificador;
