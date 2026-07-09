import {
  Activity,
  Clock,
  Globe,
  Hash,
  Server,
  Shield,
  User,
  Info,
  ChevronDown
} from 'lucide-react';
import React, { useState } from 'react';
import { Badge, Icon, MaterialCard as Card, Text } from '../../../components/atoms';
import { Modal } from '../../../components/molecules';
import type { AuditoriaEvento } from '../../../types/auditoria';
import ComparacionAntesDespues from './ComparacionAntesDespues';
import { humanizarAccion, humanizarModulo, humanizarClave, humanizarResultado } from '../../ServicePortal/pages/AuditoriaIndicadores/utils/humanizer';

interface Props {
  evento: AuditoriaEvento | null;
  onCerrar: () => void;
}

const resultadoVariant = (resultado: string) => {
  if (resultado === 'exito') return 'success';
  if (resultado === 'denegado') return 'warning';
  return 'error';
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
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {entradas.map(([clave, valor]) => (
              <div key={clave} className="bg-[var(--color-surface-variant)]/20 p-2 rounded-lg border border-[var(--color-border)]/50">
                <Text variant="caption" color="text-secondary" className="!text-[10px] uppercase block mb-0.5 truncate" title={humanizarClave(clave)}>
                  {humanizarClave(clave)}
                </Text>
                <Text variant="body2" className="font-mono text-sm break-all leading-snug">
                  {valor === null ? 'null' : String(valor)}
                </Text>
              </div>
            ))}
          </dl>
        ) : (
          <pre className="text-xs leading-relaxed p-3 rounded-lg bg-[var(--deep-navy)] text-green-300 overflow-x-auto font-mono custom-scrollbar">
            {JSON.stringify(datos, null, 2)}
          </pre>
        )}
      </div>
    </Card>
  );
};

const DetallesTecnicos: React.FC<{ evento: AuditoriaEvento }> = ({ evento }) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden mt-6">
      <button 
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="w-full px-4 py-3 bg-[var(--color-surface-variant)]/40 hover:bg-[var(--color-surface-variant)]/60 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Icon name={Server} size="sm" className="text-text-secondary" />
          <Text variant="body2" weight="semibold" color="text-primary">
            Información Técnica Avanzada
          </Text>
        </div>
        <Icon 
          name={ChevronDown} 
          size="sm" 
          className={`text-text-secondary transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} 
        />
      </button>

      {abierto && (
        <div className="p-4 space-y-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <CampoDetalle etiqueta="ID Usuario" valor={evento.usuario_id} mono icono={Hash} />
            <CampoDetalle etiqueta="Rol del Usuario" valor={evento.rol} icono={Shield} />
            <CampoDetalle etiqueta="Módulo Interno" valor={evento.modulo} mono />
            <CampoDetalle etiqueta="Acción Interna" valor={evento.accion} mono />
            
            <CampoDetalle etiqueta="Método HTTP" valor={evento.metodo_http} mono />
            <CampoDetalle etiqueta="Código Respuesta" valor={evento.codigo_respuesta != null ? String(evento.codigo_respuesta) : '—'} mono />
            <CampoDetalle etiqueta="IP Origen" valor={evento.direccion_ip} mono icono={Globe} />
            
            <div className="col-span-2 sm:col-span-3">
              <CampoDetalle etiqueta="Ruta del Servidor" valor={evento.ruta} mono />
            </div>
            
            {evento.correlacion_id && (
              <div className="col-span-2 sm:col-span-3">
                <CampoDetalle etiqueta="ID Correlación" valor={evento.correlacion_id} mono icono={Hash} />
              </div>
            )}
            {evento.agente_usuario && (
              <div className="col-span-2 sm:col-span-3">
                <CampoDetalle etiqueta="Dispositivo / Navegador (User-Agent)" valor={evento.agente_usuario} />
              </div>
            )}
          </div>

          {evento.metadatos && Object.keys(evento.metadatos).length > 0 && (
            <BloqueJson titulo="Metadatos en crudo" datos={evento.metadatos} />
          )}
        </div>
      )}
    </div>
  );
};

const AuditoriaEventoDetalle: React.FC<Props> = ({ evento, onCerrar }) => {
  if (!evento) return null;

  const esExito = evento.resultado === 'exito';
  let motivoFallo = '';
  if (!esExito) {
    const detail = evento.datos_nuevos?.detail;
    if (detail && typeof detail === 'string') motivoFallo = detail;
    else if (detail && typeof detail === 'object') motivoFallo = JSON.stringify(detail);
    
    if (!motivoFallo && evento.metadatos) {
      const metaError = evento.metadatos.error || evento.metadatos.mensaje || evento.metadatos.detail;
      if (metaError && typeof metaError === 'string') motivoFallo = metaError;
    }
    
    if (!motivoFallo) {
      const code = evento.codigo_respuesta;
      if (code === 401) motivoFallo = 'Credenciales inválidas o sesión expirada';
      else if (code === 403) motivoFallo = 'Permiso denegado para este recurso';
      else if (code === 404) motivoFallo = 'Recurso no encontrado';
      else if (code === 409) motivoFallo = 'Conflicto con datos existentes';
      else if (code === 422) motivoFallo = 'Datos de entrada inválidos';
      else if (code === 500) motivoFallo = 'Error interno del servidor';
      else if (code && code >= 400) motivoFallo = `Error HTTP ${code}`;
    }
  }

  const tituloModal = (
    <div className="flex flex-col gap-0.5 min-w-0 pr-8">
      <div className="flex items-center gap-2">
        <Text as="span" variant="h3" weight="semibold" color="text-primary">
          Detalle del Evento
        </Text>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <Icon name={Clock} size="xs" className="text-[var(--color-primary)]" />
        <Text variant="caption" color="text-secondary" className="uppercase tracking-wider">
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
      className="!max-w-4xl w-[min(100%,64rem)] !max-h-[90vh] !flex !flex-col"
      contentClassName="!p-5 sm:!p-6 overflow-y-auto custom-scrollbar !max-h-[calc(90vh-4.5rem)]"
    >
      <div className="space-y-6">
        
        {/* Cabecera Amigable */}
        <div className="bg-[var(--color-surface-variant)]/30 border border-[var(--color-border)] p-4 sm:p-5 rounded-2xl flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-[var(--color-primary)]/10 p-3 rounded-full shrink-0">
              <Icon name={Info} size="md" className="text-[var(--color-primary)]" />
            </div>
            <div>
              <Text variant="body1" className="leading-relaxed">
                El usuario <span className="font-semibold text-text-primary">{evento.usuario_nombre ?? evento.usuario_id}</span>{' '}
                <span className="font-medium text-[var(--color-primary)]">{humanizarAccion(evento.accion).toLowerCase()}</span>{' '}
                en el módulo de <span className="font-semibold text-text-primary">{humanizarModulo(evento.modulo)}</span>.
              </Text>
              
              {(evento.entidad_tipo || evento.entidad_id) && (
                <Text variant="body2" color="text-secondary" className="mt-1">
                  Se afectó el registro: <span className="font-medium">
                    {evento.entidad_tipo ? `${evento.entidad_tipo} ` : ''}
                    {evento.entidad_id ? `#${evento.entidad_id}` : ''}
                  </span>
                </Text>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-3 border-t border-[var(--color-border)]/50">
            <div className="flex items-center gap-2">
              <Text variant="body2" weight="medium" color="text-secondary">
                Resultado de la operación:
              </Text>
              <Badge variant={resultadoVariant(evento.resultado)} size="md">
                {humanizarResultado(evento.resultado, evento.codigo_respuesta)}
              </Badge>
            </div>
            
            {!esExito && motivoFallo && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-3 rounded-xl mt-1">
                <Text variant="caption" weight="bold" className="text-red-600 dark:text-red-400 uppercase tracking-wider !text-[10px] block mb-1">
                  Motivo del Fallo
                </Text>
                <Text variant="body2" className="text-red-700 dark:text-red-300">
                  {motivoFallo}
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* Datos Modificados */}
        {((evento.datos_anteriores || evento.datos_nuevos) || (evento.accion === 'crear' && evento.datos_nuevos)) && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name={Activity} size="sm" className="text-[var(--color-primary)]" />
              <Text variant="h4" weight="semibold">
                Datos Involucrados
              </Text>
            </div>
            {(evento.datos_anteriores || evento.datos_nuevos) ? (
              <ComparacionAntesDespues
                datosAnteriores={evento.datos_anteriores}
                datosNuevos={evento.datos_nuevos}
                accion={evento.accion}
              />
            ) : (
              <BloqueJson titulo="Valores Registrados" datos={evento.datos_nuevos!} />
            )}
          </section>
        )}

        {/* Sección Técnica Desplegable */}
        <DetallesTecnicos evento={evento} />

      </div>
    </Modal>
  );
};

export default AuditoriaEventoDetalle;
