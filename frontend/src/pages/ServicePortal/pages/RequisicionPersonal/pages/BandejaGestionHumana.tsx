import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, RefreshCw, ArrowLeft, Archive, Clock, CheckCircle, XCircle, Briefcase, Users, Settings, BarChart2, Printer, ListFilter } from 'lucide-react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { Button, Text, Title } from '../../../../../components/atoms';
import { NominaTable, ColumnDef } from '../../../../../components/organisms/NominaTable';
import RPStatusBadge from '../components/RPStatusBadge';
import type { RequisicionRP, EstadoRP } from '../types/requisicion.types';
import { getBandejaGH } from '../services/requisicionService';
import { ESTADO_COLORES, ESTADO_LABELS } from '../types/requisicion.types';
import ConfigTemporalesModal from '../components/ConfigTemporalesModal';
import DetalleSeguimientoRP from '../components/DetalleSeguimientoRP';
import MetricasRPModal from '../components/MetricasRPModal';
import CausalesDescarteConfigModal from '../components/modals/CausalesDescarteConfigModal';

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
  const [showCausalesConfig, setShowCausalesConfig] = useState(false);
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
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            onClick={() => setSearchParams({ id: String(row.id) })}
            className="px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-mono font-bold text-blue-700 dark:text-blue-400 hover:underline transition-colors text-center"
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
    {
      header: 'Acciones',
      accessorKey: 'id',
      align: 'center',
      cell: (row) => (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" onClick={() => onVer(row.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors" title="Ver Requisición">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={() => window.open(`/service-portal/requisicion-personal/print/${row.id}`, '_blank')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors" title="Imprimir Requisición">
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      ),
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
          <Menu as="div" className="relative inline-block text-left">
            <MenuButton as={Button} variant="ghost" icon={Settings} className="text-xs font-bold">
              Configuración
            </MenuButton>
            <MenuItems
              transition
              className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-slate-900 shadow-xl ring-1 ring-slate-900/5 focus:outline-none border border-slate-200 dark:border-slate-800 p-1 transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
            >
              <MenuItem>
                {({ focus }) => (
                  <Button variant="custom"
                    onClick={() => setShowCausalesConfig(true)}
                    className={`${
                      focus ? 'bg-slate-100 dark:bg-slate-800' : ''
                    } group flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors`}
                  >
                    <ListFilter className="mr-3 h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                    Causales de Descarte
                  </Button>
                )}
              </MenuItem>
              <MenuItem>
                {({ focus }) => (
                  <Button variant="custom"
                    onClick={() => setShowTemporalesConfig(true)}
                    className={`${
                      focus ? 'bg-slate-100 dark:bg-slate-800' : ''
                    } group flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors`}
                  >
                    <Briefcase className="mr-3 h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                    Empresas Temporales
                  </Button>
                )}
              </MenuItem>
            </MenuItems>
          </Menu>
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
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] px-4 py-2 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <Text variant="caption" color="secondary" className="text-[11px] uppercase tracking-wider font-bold truncate">Total</Text>
          </div>
          <div className="text-lg font-bold leading-none text-[var(--color-primary)] shrink-0">
            {requisiciones.length}
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
            <div key={estado} className={`rounded-xl px-4 py-2 ${colores.bg} border border-transparent shadow-sm flex items-center justify-between gap-2`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${colores.text}`} />
                </div>
                <Text variant="caption" className={`text-[11px] font-bold uppercase tracking-wider truncate ${colores.text}`}>
                  {label}
                </Text>
              </div>
              <div className={`text-lg font-bold leading-none shrink-0 ${colores.text}`}>{count}</div>
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

      {showCausalesConfig && (
        <CausalesDescarteConfigModal
          onClose={() => setShowCausalesConfig(false)}
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
