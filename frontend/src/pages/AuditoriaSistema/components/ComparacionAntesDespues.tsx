import React from 'react';
import { MaterialCard as Card, Text } from '../../../components/atoms';

interface Props {
  datosAnteriores: Record<string, unknown> | null;
  datosNuevos: Record<string, unknown> | null;
}

const formatearValor = (valor: unknown): string => {
  if (valor === null || valor === undefined) return '—';
  if (typeof valor === 'object') return JSON.stringify(valor, null, 2);
  return String(valor);
};

const valorVacio = (valor: unknown): boolean =>
  valor === null || valor === undefined || valor === '';

const ComparacionAntesDespues: React.FC<Props> = ({ datosAnteriores, datosNuevos }) => {
  const claves = Array.from(
    new Set([
      ...Object.keys(datosAnteriores ?? {}),
      ...Object.keys(datosNuevos ?? {}),
    ])
  ).sort();

  if (claves.length === 0) {
    return (
      <Text variant="body2" color="text-secondary">
        No hay cambios de datos registrados para este evento.
      </Text>
    );
  }

  const esSoloCreacion = claves.every((clave) => valorVacio(datosAnteriores?.[clave]));

  const clavesConCambio = claves.filter(
    (clave) => datosAnteriores?.[clave] !== datosNuevos?.[clave]
  );

  if (esSoloCreacion) {
    return (
      <Card className="!rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-variant)]/60">
          <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[10px]">
            Valores creados
          </Text>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 p-3 max-h-44 overflow-y-auto">
          {claves.map((clave) => (
            <div
              key={clave}
              className="rounded-lg border border-[var(--color-border)] bg-green-50/40 dark:bg-green-950/20 px-2.5 py-2 min-w-0"
            >
              <Text variant="caption" color="text-secondary" className="!text-[9px] uppercase block mb-0.5 truncate">
                {clave.replace(/_/g, ' ')}
              </Text>
              <Text variant="body2" className="font-mono text-xs break-all leading-snug">
                {formatearValor(datosNuevos?.[clave])}
              </Text>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="!rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="grid grid-cols-2 border-b border-[var(--color-border)] bg-[var(--color-surface-variant)]/60">
        <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[10px] px-3 py-1.5 border-r border-[var(--color-border)]">
          Antes
        </Text>
        <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[10px] px-3 py-1.5">
          Después
        </Text>
      </div>
      <div className="divide-y divide-[var(--color-border)] max-h-44 overflow-y-auto">
        {clavesConCambio.map((clave) => (
          <div key={clave} className="grid grid-cols-2">
            <div className="px-3 py-2 border-r border-[var(--color-border)] bg-red-50/40 dark:bg-red-950/20 min-w-0">
              <Text variant="caption" color="text-secondary" className="!text-[9px] uppercase block mb-0.5">
                {clave.replace(/_/g, ' ')}
              </Text>
              <Text variant="body2" className="font-mono text-xs break-all whitespace-pre-wrap leading-snug">
                {formatearValor(datosAnteriores?.[clave])}
              </Text>
            </div>
            <div className="px-3 py-2 bg-green-50/40 dark:bg-green-950/20 min-w-0">
              <Text variant="caption" color="text-secondary" className="!text-[9px] uppercase block mb-0.5">
                {clave.replace(/_/g, ' ')}
              </Text>
              <Text variant="body2" className="font-mono text-xs break-all whitespace-pre-wrap leading-snug">
                {formatearValor(datosNuevos?.[clave])}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ComparacionAntesDespues;
