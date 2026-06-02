import React, { useEffect, useState, useMemo } from 'react';
import { Eye, Edit, Plus, ArrowLeft, Send, XCircle, Printer } from 'lucide-react';
import { Button, Text, Title } from '../../../../../components/atoms';
import { NominaTable, ColumnDef } from '../../../../../components/organisms/NominaTable';
import RPStatusBadge from '../components/RPStatusBadge';
import type { RequisicionRP } from '../types/requisicion.types';
import { getMisRequisiciones, cancelarRequisicion, enviarAAprobacion } from '../services/requisicionService';

interface Props {
  correoSolicitante: string;
  nombreSolicitante: string;
  onNueva: () => void;
  onVer: (id: number) => void;
  onEditar: (id: number) => void;
  onVolver: () => void;
}

const MisRequisicionesRP: React.FC<Props> = ({ correoSolicitante, nombreSolicitante, onNueva, onVer, onEditar, onVolver }) => {
  const [requisiciones, setRequisiciones] = useState<RequisicionRP[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  const cargar = () => {
    setLoading(true);
    getMisRequisiciones(correoSolicitante)
      .then(setRequisiciones)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [correoSolicitante]);

  const handleCancelar = async (id: number) => {
    if (!window.confirm('¿Está seguro de cancelar esta requisición?')) return;
    await cancelarRequisicion(id, correoSolicitante, nombreSolicitante);
    cargar();
  };

  const handleReenviar = async (id: number) => {
    await enviarAAprobacion(id, correoSolicitante, nombreSolicitante);
    cargar();
  };

  const columns = useMemo<ColumnDef<RequisicionRP>[]>(() => [
    {
      header: 'RP',
      accessorKey: 'rp',
      align: 'center',
      cell: (row) => (
        <Text as="span" className="font-mono font-bold text-[var(--color-primary)]">
          {row.rp || <Text as="span" className="text-[var(--color-text-tertiary)] italic">Sin RP</Text>}
        </Text>
      ),
    },
    {
      header: 'Fecha',
      accessorKey: 'fecha_radicacion',
      align: 'center',
      cell: (row) => (
        <Text as="span" className="text-[var(--color-text-secondary)]">
          {row.fecha_radicacion ? new Date(row.fecha_radicacion).toLocaleDateString('es-CO') : '—'}
        </Text>
      ),
    },
    {
      header: 'Área',
      accessorKey: 'area_nombre',
      align: 'left',
      cell: (row) => <Text as="span">{row.area_nombre || '—'}</Text>,
    },
    {
      header: 'Cargo',
      accessorKey: 'cargo_nombre',
      align: 'left',
      cell: (row) => <Text as="span">{row.cargo_nombre || '—'}</Text>,
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      align: 'center',
      cell: (row) => <RPStatusBadge estado={row.estado} size="sm" />,
    },
    {
      header: 'Aprobador',
      accessorKey: 'aprobador_nombre',
      align: 'left',
      cell: (row) => <Text as="span" className="text-[var(--color-text-secondary)]">{row.aprobador_nombre || '—'}</Text>,
    },
    {
      header: 'Acciones',
      accessorKey: 'id',
      align: 'center',
      enableColumnFilter: false,
      cell: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" onClick={() => onVer(row.id)} title="Ver detalle"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors">
            <Eye className="w-4 h-4" />
          </Button>
          {['APROBADA', 'EN_PROCESO_SELECCION', 'CERRADA'].includes(row.estado) && (
            <Button variant="ghost" onClick={() => window.open(`/service-portal/requisicion-personal/print/${row.id}`, '_blank')} title="Imprimir"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors">
              <Printer className="w-4 h-4" />
            </Button>
          )}
          {(row.estado === 'BORRADOR' || row.estado === 'DEVUELTA_AJUSTE') && (
            <Button variant="ghost" onClick={() => onEditar(row.id)} title="Editar"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 transition-colors">
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {row.estado === 'DEVUELTA_AJUSTE' && (
            <Button variant="ghost" onClick={() => handleReenviar(row.id)} title="Reenviar a aprobación"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors">
              <Send className="w-4 h-4" />
            </Button>
          )}
          {row.estado === 'BORRADOR' && (
            <Button variant="ghost" onClick={() => handleCancelar(row.id)} title="Cancelar"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-red-600 transition-colors">
              <XCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], [onVer, onEditar, handleCancelar, handleReenviar]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVolver} icon={ArrowLeft} className="font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl" />
          <div>
            <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              Mis Requisiciones de Personal
            </Title>
            <Text variant="caption" color="text-secondary" className="block text-[10px] leading-none uppercase tracking-widest opacity-70 mt-1">
              RECURSOS HUMANOS / MIS SOLICITUDES
            </Text>
          </div>
        </div>
        <Button variant="primary" icon={Plus} onClick={onNueva}>Nueva Requisición</Button>
      </div>

      {requisiciones.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
          <Text color="secondary" className="mb-4">No tiene requisiciones registradas aún.</Text>
          <Button variant="primary" icon={Plus} onClick={onNueva}>Crear primera requisición</Button>
        </div>
      ) : (
        <div className="min-h-0 flex flex-col space-y-3 overflow-hidden">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <NominaTable
              data={requisiciones}
              columns={columns}
              globalFilterText={searchText}
              onGlobalFilterChange={setSearchText}
              exportFileName="mis_requisiciones_rp.csv"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MisRequisicionesRP;
