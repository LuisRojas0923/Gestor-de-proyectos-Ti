import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, RefreshCw, ArrowLeft, Archive, Clock, CheckCircle, XCircle, Briefcase, Users, Settings, BarChart2 } from 'lucide-react';
import { Button, Text, Title } from '../../../../../components/atoms';
import { NominaTable, ColumnDef } from '../../../../../components/organisms/NominaTable';
import RPStatusBadge from '../components/RPStatusBadge';
import type { RequisicionRP, EstadoRP } from '../types/requisicion.types';
import { getBandejaGH } from '../services/requisicionService';
import { ESTADO_COLORES, ESTADO_LABELS } from '../types/requisicion.types';
import ConfigTemporalesModal from '../components/ConfigTemporalesModal';
import DetalleSeguimientoRP from '../components/DetalleSeguimientoRP';
import MetricasRPModal from '../components/MetricasRPModal';

const ICONOS: Record<string, React.ElementType> = {
  BORRADOR: Archive,
  PENDIENTE_APROBACION: Clock,
  DEVUELTA_AJUSTE: XCircle,
  APROBADA: CheckCircle,
  RECHAZADA: XCircle,
  EN_PROCESO_SELECCION: Users,
  CERRADA: Archive,
  CANCELADA: XCircle,
};


interface Props {
  onVer: (id: number) => void;
  onVolver: () => void;
}

const BandejaGestionHumana: React.FC<Props> = ({ onVer, onVolver }) => {
  const [requisiciones, setRequisiciones] = useState<RequisicionRP[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequisicion, setSelectedRequisicion] = useState<RequisicionRP | null>(null);
  const [showTemporalesConfig, setShowTemporalesConfig] = useState(false);
  const [showMetricas, setShowMetricas] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState('');

  const selectedId = searchParams.get('id');

  const columns = useMemo<ColumnDef<RequisicionRP>[]>(() => [
    {
      header: 'RP',
      accessorKey: 'rp',
      align: 'center',
      cell: (row) => (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" onClick={() => onVer(row.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors" title="Ver Requisición">
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setSearchParams({ id: String(row.id) })}
            className="px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-mono font-bold text-blue-700 dark:text-blue-400 hover:underline transition-colors text-left"
            title="Gestionar Seguimiento y Candidatos"
          >
            {row.rp || 'Sin RP'}
          </Button>
        </div>
      ),
    },
    {
      header: 'Solicitante',
      accessorKey: 'nombre_solicitante',
      align: 'left',
      cell: (row) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200">{row.nombre_solicitante}</div>
          <div className="text-xs text-[var(--color-text-tertiary)]">{row.correo_solicitante}</div>
        </div>
      ),
    },
    {
      header: 'Área / Cargo',
      accessorKey: 'area_nombre',
      align: 'left',
      cell: (row) => (
        <div>
          <div className="text-slate-800 dark:text-slate-200">{row.area_nombre}</div>
          <div className="text-xs text-[var(--color-text-tertiary)]">{row.cargo_nombre}</div>
        </div>
      ),
    },
    {
      id: 'ubicacion',
      header: 'Ubicación',
      accessorFn: (row: RequisicionRP) => `${row.departamento || ''} - ${row.municipio || ''}`,
      cell: (row) => <Text as="span">{row.departamento && row.municipio ? `${row.departamento} - ${row.municipio}` : '—'}</Text>,
      sortable: true,
      align: 'left'
    },
    {
      header: 'Recibida GH',
      accessorKey: 'fecha_decision_gerente',
      align: 'center',
      cell: (row) => {
        if (!row.fecha_decision_gerente) return <Text as="span" className="text-[var(--color-text-tertiary)]">—</Text>;
        const d = new Date(row.fecha_decision_gerente);
        return (
          <Text as="span" className="font-mono text-xs text-[var(--color-text-secondary)]">
            {d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </Text>
        );
      },
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      align: 'center',
      cell: (row) => <RPStatusBadge estado={row.estado as EstadoRP} size="sm" />,
    },
  ], [onVer, setSearchParams]);

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

  useEffect(() => {
    cargar();
  }, []);

  const cargar = () => {
    setLoading(true);
    getBandejaGH()
      .then((data) => {
        setRequisiciones(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVolver} icon={ArrowLeft} className="font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl" />
          <div>
            <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              Seguimiento RP Gestión Humana
            </Title>
            <Text variant="caption" color="text-secondary" className="block text-[10px] leading-none uppercase tracking-widest opacity-70 mt-1">
              RECURSOS HUMANOS / CONTROL Y SEGUIMIENTO
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            icon={BarChart2}
            onClick={() => setShowMetricas(true)}
            className="text-xs font-bold"
          >
            Métricas RP
          </Button>
          <Button
            variant="ghost"
            icon={Settings}
            onClick={() => setShowTemporalesConfig(true)}
            className="text-xs font-bold"
          >
            Configurar Temporales
          </Button>
          <Button
            variant="ghost"
            icon={RefreshCw}
            onClick={cargar}
            title="Actualizar"
          />
        </div>
      </div>

      {/* Tarjetas de Métricas del Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 flex flex-col items-center justify-center text-center gap-2 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="min-w-0">
            <Text variant="caption" color="secondary" className="block uppercase tracking-wider font-bold">Total</Text>
            <div className="text-xl font-bold leading-none mt-1">
              {requisiciones.length}
            </div>
          </div>
        </div>

        {/* Estados activos del flujo GH */}
        {(['APROBADA', 'EN_PROCESO_SELECCION', 'CERRADA'] as const).map(estado => {
          const count = estado === 'CERRADA'
            ? requisiciones.filter(r => r.estado === 'CERRADA' || r.estado === 'CANCELADA').length
            : requisiciones.filter(r => r.estado === estado).length;
            
          const label = estado === 'CERRADA' ? 'Cerradas / Canceladas' : (ESTADO_LABELS[estado] ?? estado);
          const colores = ESTADO_COLORES[estado] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
          const Icon = ICONOS[estado] || Archive;
          
          return (
            <div key={estado} className={`rounded-2xl p-4 ${colores.bg} border border-transparent shadow-sm flex flex-col items-center justify-center text-center gap-2`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                <Icon className={`w-5 h-5 ${colores.text}`} />
              </div>
              <div className="min-w-0">
                <Text variant="caption" className={`block truncate font-bold uppercase tracking-wider ${colores.text}`}>
                  {label}
                </Text>
                <div className={`text-xl font-bold leading-none mt-1 ${colores.text}`}>{count}</div>
              </div>
            </div>
          );
        })}
      </div>

      {requisiciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center shadow-inner">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <Title variant="h5" weight="bold" align="center" className="text-slate-800 dark:text-slate-100">
              ¡Todo al día!
            </Title>
            <Text color="secondary" align="center" className="text-sm">
              No hay requisiciones aprobadas pendientes de gestión.
            </Text>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex flex-col space-y-3 overflow-hidden">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <NominaTable
              data={requisiciones}
              columns={columns}
              globalFilterText={searchText}
              onGlobalFilterChange={setSearchText}
              exportFileName="seguimiento_rp_gestion_humana.csv"
            />
          </div>
        </div>
      )}

      {showTemporalesConfig && (
        <ConfigTemporalesModal
          onClose={() => setShowTemporalesConfig(false)}
          onRefreshList={cargar}
        />
      )}

      <MetricasRPModal
        isOpen={showMetricas}
        onClose={() => setShowMetricas(false)}
        requisiciones={requisiciones}
      />
    </div>
  );
};

export default BandejaGestionHumana;
