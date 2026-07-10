import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Eye, Edit, Plus, ArrowLeft, Send, XCircle, Printer, Briefcase } from 'lucide-react';
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
  onVolver?: () => void;
  hideHeader?: boolean;
}

const MisRequisicionesRP: React.FC<Props> = ({ correoSolicitante, nombreSolicitante, onNueva, onVer, onEditar, onVolver, hideHeader = false }) => {
  const [requisiciones, setRequisiciones] = useState<RequisicionRP[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    getMisRequisiciones(correoSolicitante)
      .then(setRequisiciones)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [correoSolicitante]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCancelar = useCallback(async (id: number) => {
    if (!window.confirm('¿Está seguro de cancelar esta requisición?')) return;
    await cancelarRequisicion(id, correoSolicitante, nombreSolicitante);
    cargar();
  }, [correoSolicitante, nombreSolicitante, cargar]);

  const handleReenviar = useCallback(async (id: number) => {
    await enviarAAprobacion(id, correoSolicitante, nombreSolicitante);
    cargar();
  }, [correoSolicitante, nombreSolicitante, cargar]);

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
          <Button variant="ghost" onClick={() => window.open(`/service-portal/requisicion-personal/print/${row.id}`, '_blank')} title="Imprimir"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors">
            <Printer className="w-4 h-4" />
          </Button>
          {(row.estado === 'BORRADOR' || row.estado === 'DEVUELTA_AJUSTE' || row.estado === 'DEVUELTA_MODIFICACION_SALARIAL') && (
            <Button variant="ghost" onClick={() => onEditar(row.id)} title="Editar"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 transition-colors">
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {(row.estado === 'DEVUELTA_AJUSTE' || row.estado === 'DEVUELTA_MODIFICACION_SALARIAL') && (
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
    <div className={`${hideHeader ? '' : 'space-y-6'} animate-in fade-in duration-500`}>
      {/* Header Estandarizado */}
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            {onVolver && (
              <Button variant="ghost" size="icon" onClick={onVolver} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                Mis Solicitudes — Requisiciones de Personal
              </Title>
            </div>
          </div>
          <Button variant="primary" icon={Plus} onClick={onNueva}>Nueva Requisición</Button>
        </div>
      )}

      {requisiciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-sm space-y-4 max-w-4xl mx-auto animate-in fade-in duration-500">
          <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-neutral-800 flex items-center justify-center shadow-inner border border-slate-100 dark:border-neutral-700">
            <Briefcase className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
          <div className="space-y-1">
            <Title variant="h5" weight="bold" align="center" className="text-slate-800 dark:text-slate-100">
              No tienes requisiciones
            </Title>
            <Text color="primary" align="center" className="text-sm">
              Aún no has registrado ninguna requisición de personal.
            </Text>
          </div>
          <Button variant="primary" icon={Plus} onClick={onNueva} className="mt-2">
            Crear primera requisición
          </Button>
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
              customSort={(a, b) => {
                const dateA = a.fecha_radicacion ? new Date(a.fecha_radicacion).getTime() : 0;
                const dateB = b.fecha_radicacion ? new Date(b.fecha_radicacion).getTime() : 0;
                if (dateB !== dateA) return dateB - dateA;
                return (b.id || 0) - (a.id || 0);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MisRequisicionesRP;
