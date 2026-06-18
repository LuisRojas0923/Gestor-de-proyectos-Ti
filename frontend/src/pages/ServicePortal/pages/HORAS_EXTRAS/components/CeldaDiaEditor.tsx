/**
 * CeldaDiaEditor — Modal para editar Entrada/Salida/Almuerzo + Novedad
 * de un día específico de un empleado.
 */
import React, { useState } from 'react';
import { Input, Button, Text, Select, Textarea } from '../../../../../components/atoms';
import { X, Save } from 'lucide-react';
import { labelDia } from '../utils/horarioUtils';
import type { PlanDiaIn, PlanNovedadIn } from '../../../../../types/horasExtras';

const CODIGOS_NOVEDAD = ['INC', 'VAC', 'AUS', 'LIC'];

interface CeldaDiaEditorProps {
  abierto: boolean;
  cedula: string;
  diaSemana: number;
  fecha: string;
  dia: PlanDiaIn;
  onCerrar: () => void;
  onGuardar: (dia: PlanDiaIn) => void;
}

const CeldaDiaEditor: React.FC<CeldaDiaEditorProps> = ({
  abierto,
  cedula,
  diaSemana,
  fecha,
  dia,
  onCerrar,
  onGuardar,
}) => {
  const [entrada, setEntrada] = useState<string | null>(dia.hora_entrada);
  const [salida, setSalida] = useState<string | null>(dia.hora_salida);
  const [almuerzo, setAlmuerzo] = useState<number>(dia.minutos_almuerzo);
  const [novedadCodigo, setNovedadCodigo] = useState<string>('');
  const [novedadObs, setNovedadObs] = useState<string>('');

  if (!abierto) return null;

  const handleGuardar = () => {
    const nuevasNovedades: PlanNovedadIn[] = [...dia.novedades];
    if (novedadCodigo) {
      nuevasNovedades.push({
        codigo_novedad: novedadCodigo,
        fecha_inicio: fecha,
        fecha_fin: fecha,
        observaciones: novedadObs || null,
      });
    }
    onGuardar({
      dia_semana: diaSemana,
      hora_entrada: entrada,
      hora_salida: salida,
      minutos_almuerzo: almuerzo,
      novedades: nuevasNovedades,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Text className="font-semibold">
              {cedula} — {labelDia(diaSemana)}
            </Text>
            <Text className="text-xs text-slate-500">{fecha}</Text>
          </div>
          <Button variant="ghost" size="sm" onClick={onCerrar} aria-label="Cerrar">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Text className="text-xs text-slate-500 mb-1">Entrada</Text>
            <Input
              type="time"
              value={entrada ?? ''}
              onChange={(e) => setEntrada(e.target.value || null)}
            />
          </div>
          <div>
            <Text className="text-xs text-slate-500 mb-1">Salida</Text>
            <Input
              type="time"
              value={salida ?? ''}
              onChange={(e) => setSalida(e.target.value || null)}
            />
          </div>
          <div className="col-span-2">
            <Text className="text-xs text-slate-500 mb-1">Almuerzo (minutos)</Text>
            <Input
              type="number"
              min={0}
              max={240}
              value={almuerzo}
              onChange={(e) =>
                setAlmuerzo(Math.max(0, Math.min(240, Number(e.target.value) || 0)))
              }
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 mb-3">
          <Text className="text-xs text-slate-500 mb-1">Novedad (opcional)</Text>
          <Select
            value={novedadCodigo}
            onChange={(e) => setNovedadCodigo(e.target.value)}
            className="w-full mb-2"
            options={[
              { value: '', label: '— Sin novedad —' },
              ...CODIGOS_NOVEDAD.map((c) => ({ value: c, label: c })),
            ]}
          />
          {novedadCodigo && (
            <Textarea
              value={novedadObs}
              onChange={(e) => setNovedadObs(e.target.value)}
              placeholder="Observaciones (opcional)"
              rows={2}
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardar}>
            <Save className="w-4 h-4 mr-1" />
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CeldaDiaEditor;
