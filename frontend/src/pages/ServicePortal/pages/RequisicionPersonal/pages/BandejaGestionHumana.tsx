import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, RefreshCw, ArrowLeft, Archive, Clock, CheckCircle, XCircle, Briefcase, Users, Settings } from 'lucide-react';
import { Title, Text, Select, Button } from '../../../../../components/atoms';
import RPStatusBadge from '../components/RPStatusBadge';
import type { RequisicionRP, EstadoRP } from '../types/requisicion.types';
import { getBandejaGH, actualizarEstadoGH } from '../services/requisicionService';
import { ESTADO_COLORES, ESTADO_LABELS } from '../types/requisicion.types';
import ConfigTemporalesModal from '../components/ConfigTemporalesModal';
import DetalleSeguimientoRP from '../components/DetalleSeguimientoRP';

const ICONOS: Record<string, React.ElementType> = {
  BORRADOR: Archive,
  PENDIENTE_APROBACION: Clock,
  DEVUELTA_AJUSTE: XCircle,
  APROBADA: CheckCircle,
  RECHAZADA: XCircle,
  EN_PROCESO_SELECCION: Users,
  CANDIDATO_SELECCIONADO: CheckCircle,
  EN_PROCESO_CONTRATACION: Briefcase,
  CERRADA: Archive,
  CANCELADA: XCircle,
};

const TRANSICIONES_GH: Record<string, { label: string; value: string }[]> = {
  APROBADA:               [{ value: 'EN_PROCESO_SELECCION', label: 'Iniciar proceso de selección' }, { value: 'CANCELADA', label: 'Cancelar' }],
  EN_PROCESO_SELECCION:   [{ value: 'CANDIDATO_SELECCIONADO', label: 'Candidato seleccionado' }, { value: 'CANCELADA', label: 'Cancelar' }],
  CANDIDATO_SELECCIONADO: [{ value: 'EN_PROCESO_CONTRATACION', label: 'Iniciar contratación' }, { value: 'CANCELADA', label: 'Cancelar' }],
  EN_PROCESO_CONTRATACION:[{ value: 'CERRADA', label: 'Cerrar requisición' }, { value: 'CANCELADA', label: 'Cancelar' }],
};

interface Props {
  onVer: (id: number) => void;
  onVolver: () => void;
}

const BandejaGestionHumana: React.FC<Props> = ({ onVer, onVolver }) => {
  const [requisiciones, setRequisiciones] = useState<RequisicionRP[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [selectedRequisicion, setSelectedRequisicion] = useState<RequisicionRP | null>(null);
  const [showTemporalesConfig, setShowTemporalesConfig] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedId = searchParams.get('id');

  useEffect(() => {
    if (selectedId) {
      const found = requisiciones.find(r => r.id === Number(selectedId));
      if (found) {
        setSelectedRequisicion(found);
      }
    } else {
      setSelectedRequisicion(null);
    }
  }, [selectedId, requisiciones]);

  const cargar = () => {
    setLoading(true);
    getBandejaGH()
      .then((data) => {
        setRequisiciones(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleCambiarEstado = async (id: number, nuevoEstado: string) => {
    if (!nuevoEstado) return;
    const obs = nuevoEstado === 'CERRADA' || nuevoEstado === 'CANCELADA'
      ? window.prompt('Observación de cierre/cancelación:') || ''
      : undefined;
    setProcesando(id);
    try {
      await actualizarEstadoGH(id, nuevoEstado, obs);
      cargar();
    } finally {
      setProcesando(null);
    }
  };

  if (selectedRequisicion) {
    return (
      <DetalleSeguimientoRP
        requisicion={selectedRequisicion}
        onBack={() => {
          setSearchParams({});
          cargar();
        }}
        onStatusChanged={cargar}
      />
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onVolver} icon={ArrowLeft} className="font-bold p-0">
        Volver
      </Button>
      <div className="flex items-center justify-between">
        <Title variant="h5" weight="bold">Seguimiento RP Gestión Humana</Title>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            icon={Settings}
            onClick={() => setShowTemporalesConfig(true)}
            className="text-xs font-bold"
          >
            Configurar Temporales
          </Button>
          <button onClick={cargar} className="p-2 rounded-xl hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas del Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="min-w-0">
            <Text variant="caption" color="secondary" className="block truncate">Total</Text>
            <div className="text-lg font-bold leading-none mt-0.5">
              {requisiciones.length}
            </div>
          </div>
        </div>

        {/* Estados principales gestionados por GH */}
        {(['APROBADA', 'EN_PROCESO_SELECCION', 'CANDIDATO_SELECCIONADO', 'EN_PROCESO_CONTRATACION', 'CERRADA'] as const).map(estado => {
          const count = estado === 'CERRADA'
            ? requisiciones.filter(r => r.estado === 'CERRADA' || r.estado === 'CANCELADA').length
            : requisiciones.filter(r => r.estado === estado).length;
            
          const label = estado === 'CERRADA' ? 'Cerradas / Canceladas' : (ESTADO_LABELS[estado] ?? estado);
          const colores = ESTADO_COLORES[estado] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
          const Icon = ICONOS[estado] || Archive;
          
          return (
            <div key={estado} className={`rounded-2xl p-4 ${colores.bg} border border-transparent shadow-sm flex items-center gap-4`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                <Icon className={`w-5 h-5 ${colores.text}`} />
              </div>
              <div className="min-w-0">
                <Text variant="caption" className={`block truncate font-medium ${colores.text}`}>
                  {label}
                </Text>
                <div className={`text-lg font-bold leading-none mt-0.5 ${colores.text}`}>{count}</div>
              </div>
            </div>
          );
        })}
      </div>

      {requisiciones.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
          <Text color="secondary">No hay requisiciones aprobadas pendientes de gestión.</Text>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]">
              <tr>
                {['RP', 'Solicitante', 'Área / Cargo', 'Ciudad', 'Estado', 'Acción GH'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {requisiciones.map(req => {
                const opciones = TRANSICIONES_GH[req.estado] || [];
                return (
                  <tr key={req.id} className="hover:bg-[var(--color-surface-secondary)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onVer(req.id)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors" title="Ver Requisición">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSearchParams({ id: String(req.id) })}
                          className="font-mono font-bold text-[var(--color-primary)] hover:underline transition-colors text-left"
                          title="Gestionar Seguimiento y Candidatos"
                        >
                          {req.rp}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{req.nombre_solicitante}</div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">{req.correo_solicitante}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{req.area_nombre}</div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">{req.cargo_nombre}</div>
                    </td>
                    <td className="px-4 py-3">{req.ciudad_nombre || '—'}</td>
                    <td className="px-4 py-3"><RPStatusBadge estado={req.estado as EstadoRP} size="sm" /></td>
                    <td className="px-4 py-3">
                      {opciones.length > 0 ? (
                        <select
                          disabled={procesando === req.id}
                          onChange={e => handleCambiarEstado(req.id, e.target.value)}
                          defaultValue=""
                          className="text-sm border border-[var(--color-border)] rounded-lg px-2 py-1.5 bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value="" disabled>Cambiar estado...</option>
                          {opciones.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                      ) : (
                        <Text variant="caption" color="secondary" className="italic">Sin acciones</Text>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showTemporalesConfig && (
        <ConfigTemporalesModal
          onClose={() => setShowTemporalesConfig(false)}
          onRefreshList={cargar}
        />
      )}
    </div>
  );
};

export default BandejaGestionHumana;
