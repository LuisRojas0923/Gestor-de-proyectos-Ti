import {
  Activity,
  Clock,
  Globe,
  Hash,
  Server,
  Shield,
  User,
} from 'lucide-react';
import React from 'react';
import { Badge, Icon, MaterialCard as Card, Text } from '../../../components/atoms';
import { Modal } from '../../../components/molecules';
import type { AuditoriaEvento } from '../../../types/auditoria';
import ComparacionAntesDespues from './ComparacionAntesDespues';
import { humanizarAccionDetallada } from '../../ServicePortal/pages/AuditoriaIndicadores/utils/humanizer';

interface Props {
  evento: AuditoriaEvento | null;
  onCerrar: () => void;
}

const resultadoVariant = (resultado: string) => {
  if (resultado === 'exito') return 'success';
  if (resultado === 'denegado') return 'warning';
  return 'error';
};

const resultadoEtiqueta = (resultado: string) => {
  if (resultado === 'exito') return 'Éxito';
  if (resultado === 'denegado') return 'Denegado';
  return 'Fallo';
};

const formatearFecha = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
};

interface CampoDetalleProps {
  etiqueta: string;
  valor: React.ReactNode;
  mono?: boolean;
  icono?: React.ComponentType<{ size?: number; className?: string }>;
}

const CampoDetalle: React.FC<CampoDetalleProps> = ({ etiqueta, valor, mono, icono: Icono }) => (
  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-variant)]/40 px-2.5 py-2 min-w-0">
    <div className="flex items-center gap-1 mb-0.5">
      {Icono && <Icono size={12} className="text-[var(--color-primary)] shrink-0" />}
      <Text
        variant="caption"
        color="text-secondary"
        weight="bold"
        className="uppercase tracking-wider !text-[10px]"
      >
        {etiqueta}
      </Text>
    </div>
    <Text
      variant="body2"
      weight="medium"
      className={`break-words ${mono ? 'font-mono !text-sm' : ''}`}
    >
      {valor ?? '—'}
    </Text>
  </div>
);

const BloqueJson: React.FC<{ titulo: string; datos: Record<string, unknown> }> = ({ titulo, datos }) => {
  const entradas = Object.entries(datos);
  const esPlano = entradas.every(([, v]) => v === null || typeof v !== 'object');

  return (
    <Card className="!rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-variant)]/60">
        <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px]">
          {titulo}
        </Text>
      </div>
      <div className="p-4">
        {esPlano ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entradas.map(([clave, valor]) => (
              <div key={clave}>
                <Text variant="caption" color="text-secondary" className="!text-[10px] uppercase block mb-0.5">
                  {clave.replace(/_/g, ' ')}
                </Text>
                <Text variant="body2" className="font-mono text-sm break-all">
                  {valor === null ? 'null' : String(valor)}
                </Text>
              </div>
            ))}
          </dl>
        ) : (
          <pre className="text-xs leading-relaxed p-3 rounded-lg bg-[var(--deep-navy)] text-green-300 overflow-x-auto font-mono">
            {JSON.stringify(datos, null, 2)}
          </pre>
        )}
      </div>
    </Card>
  );
};

const AuditoriaEventoDetalle: React.FC<Props> = ({ evento, onCerrar }) => {
  if (!evento) return null;

  const tituloModal = (
    <div className="flex flex-col gap-0.5 min-w-0 pr-8">
      <div className="flex flex-wrap items-center gap-2">
        <Text as="span" variant="h3" weight="semibold" color="text-primary">
          Evento #{evento.id}
        </Text>
        <Badge variant={resultadoVariant(evento.resultado)} size="sm">
          {resultadoEtiqueta(evento.resultado)}
        </Badge>
      </div>
      <div className="flex items-center gap-1.5">
        <Icon name={Clock} size="xs" className="text-[var(--color-primary)]" />
        <Text variant="caption" color="text-secondary">
          {formatearFecha(evento.timestamp)}
        </Text>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={!!evento}
      onClose={onCerrar}
      title={tituloModal}
      size="full"
      className="!max-w-6xl w-[min(100%,72rem)] !max-h-[85vh] !flex !flex-col"
      contentClassName="!p-4 !pt-3 overflow-y-auto !max-h-[calc(85vh-4.5rem)]"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section>
          <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wider !text-[10px] mb-2 block">
            Actor y acción
          </Text>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <CampoDetalle
              etiqueta="Usuario"
              valor={evento.usuario_nombre ?? evento.usuario_id}
              icono={User}
            />
            <CampoDetalle etiqueta="ID usuario" valor={evento.usuario_id} mono icono={Hash} />
            <CampoDetalle etiqueta="Rol" valor={evento.rol} icono={Shield} />
            <CampoDetalle etiqueta="Módulo" valor={evento.modulo} icono={Server} />
            <CampoDetalle etiqueta="Acción" valor={evento.accion} icono={Activity} />
            <CampoDetalle
              etiqueta="Entidad"
              valor={
                evento.entidad_tipo || evento.entidad_id
                  ? `${evento.entidad_tipo ?? ''} ${evento.entidad_id ?? ''}`.trim()
                  : '—'
              }
            />
            {evento.datos_nuevos?.nombre != null && (
              <CampoDetalle etiqueta="Nombre" valor={String(evento.datos_nuevos.nombre)} />
            )}
            {evento.datos_nuevos?.tipo != null && (
              <CampoDetalle etiqueta="Tipo" valor={String(evento.datos_nuevos.tipo)} />
            )}
            {evento.datos_anteriores?.nombre != null && !evento.datos_nuevos?.nombre && (
              <CampoDetalle etiqueta="Nombre" valor={String(evento.datos_anteriores.nombre)} />
            )}
          </div>
          <div className="mt-4 col-span-2 sm:col-span-3">
            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wider !text-[10px] mb-1 block">
              Descripción de la acción
            </Text>
            <div className="p-3 bg-[var(--color-surface)] dark:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] rounded shadow-sm overflow-x-auto">
              <Text variant="body2" className="whitespace-pre-wrap break-words font-mono text-[12px] text-[var(--color-text-primary)]">
                {humanizarAccionDetallada(evento)}
              </Text>
            </div>
          </div>
        </section>

        <section>
          <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wider !text-[10px] mb-2 block">
            Petición HTTP
          </Text>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <CampoDetalle
              etiqueta="Método"
              valor={evento.metodo_http}
              mono
            />
            <CampoDetalle
              etiqueta="Código respuesta"
              valor={evento.codigo_respuesta != null ? String(evento.codigo_respuesta) : '—'}
              mono
            />
            <CampoDetalle etiqueta="IP origen" valor={evento.direccion_ip} mono icono={Globe} />
            <div className="col-span-2 sm:col-span-3">
              <CampoDetalle etiqueta="Ruta" valor={evento.ruta} mono />
            </div>
            {evento.correlacion_id && (
              <div className="col-span-2 sm:col-span-3">
                <CampoDetalle etiqueta="ID correlación" valor={evento.correlacion_id} mono icono={Hash} />
              </div>
            )}
            {evento.agente_usuario && (
              <div className="col-span-2 sm:col-span-3">
                <CampoDetalle etiqueta="User-Agent" valor={evento.agente_usuario} />
              </div>
            )}
          </div>
        </section>
        </div>

        <section className="space-y-2">
          <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wider !text-[10px] block">
            Cambios registrados
          </Text>
          {(evento.datos_anteriores || evento.datos_nuevos) ? (
            <ComparacionAntesDespues
              datosAnteriores={evento.datos_anteriores}
              datosNuevos={evento.datos_nuevos}
            />
          ) : evento.accion === 'crear' && evento.datos_nuevos ? (
            <BloqueJson titulo="Datos creados" datos={evento.datos_nuevos} />
          ) : (
            <Text variant="body2" color="text-secondary">
              Este evento no incluye diff antes/después (registro anterior al cambio o sin payload).
            </Text>
          )}
        </section>

        {evento.metadatos && Object.keys(evento.metadatos).length > 0 && (
          <section>
            <BloqueJson titulo="Metadatos adicionales" datos={evento.metadatos} />
          </section>
        )}
      </div>
    </Modal>
  );
};

export default AuditoriaEventoDetalle;
