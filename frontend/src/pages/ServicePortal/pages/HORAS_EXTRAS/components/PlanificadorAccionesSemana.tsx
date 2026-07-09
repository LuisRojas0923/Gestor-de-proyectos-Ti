import React from 'react';
import { Calculator, CheckCircle2, Save } from 'lucide-react';
import { Button } from '../../../../../components/atoms';

interface PlanificadorAccionesSemanaProps {
  seleccionadosCount: number;
  preCalculando: boolean;
  guardando: boolean;
  confirmando: boolean;
  onPreCalcular: () => void;
  onGuardarBorrador: () => void;
  onConfirmarSemana: () => void;
}

const compactButtonClass = 'h-8 rounded-xl !px-2.5 !text-[11px] shadow-none [&>span]:inline-flex [&>span]:items-center [&>span]:!text-[11px] [&_svg]:mr-1 [&_svg]:h-3 [&_svg]:w-3';

const PlanificadorAccionesSemana: React.FC<PlanificadorAccionesSemanaProps> = ({
  seleccionadosCount,
  preCalculando,
  guardando,
  confirmando,
  onPreCalcular,
  onGuardarBorrador,
  onConfirmarSemana,
}) => {
  const sinSeleccion = seleccionadosCount === 0;

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={onPreCalcular}
        disabled={sinSeleccion}
        loading={preCalculando}
        title="Pre-calcular"
        aria-label="Pre-calcular"
        className={compactButtonClass}
      >
        <Calculator />Pre-calcular
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onGuardarBorrador}
        disabled={sinSeleccion}
        loading={guardando}
        title="Guardar borrador"
        aria-label="Guardar borrador"
        className={compactButtonClass}
      >
        <Save />Guardar
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={onConfirmarSemana}
        disabled={sinSeleccion}
        loading={confirmando}
        title="Confirmar semana"
        aria-label="Confirmar semana"
        className={compactButtonClass}
      >
        <CheckCircle2 />Confirmar
      </Button>
    </>
  );
};

export default PlanificadorAccionesSemana;
