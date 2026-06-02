import React, { useEffect, useState, useMemo } from 'react';
import { Eye, CheckCircle, XCircle, RotateCcw, ArrowLeft } from 'lucide-react';
import { Button, Text, Textarea, Title } from '../../../../../components/atoms';
import { NominaTable, ColumnDef } from '../../../../../components/organisms/NominaTable';
import RPStatusBadge from '../components/RPStatusBadge';
import type { RequisicionRP } from '../types/requisicion.types';
import { getBandejaAprobador, aprobarRequisicion, rechazarRequisicion, devolverRequisicion } from '../services/requisicionService';

interface Props {
  correoAprobador: string;
  onVer: (id: number) => void;
  onVolver: () => void;
}

interface ModalAccion {
  tipo: 'aprobar' | 'rechazar' | 'devolver';
  requisicionId: number;
  rp: string;
}

const BandejaAprobadorRP: React.FC<Props> = ({ correoAprobador, onVer, onVolver }) => {
  const [requisiciones, setRequisiciones] = useState<RequisicionRP[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalAccion | null>(null);
  const [observacion, setObservacion] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [searchText, setSearchText] = useState('');

  const cargar = () => {
    setLoading(true);
    getBandejaAprobador(correoAprobador)
      .then(setRequisiciones)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [correoAprobador]);

  const handleAccion = async () => {
    if (!modal) return;
    if ((modal.tipo === 'rechazar' || modal.tipo === 'devolver') && !observacion.trim()) {
      alert('La observación es obligatoria para esta acción.');
      return;
    }
    setProcesando(true);
    try {
      if (modal.tipo === 'aprobar') await aprobarRequisicion(modal.requisicionId, observacion);
      if (modal.tipo === 'rechazar') await rechazarRequisicion(modal.requisicionId, observacion);
      if (modal.tipo === 'devolver') await devolverRequisicion(modal.requisicionId, observacion);
      setModal(null);
      setObservacion('');
      cargar();
    } finally {
      setProcesando(false);
    }
  };

  const columns = useMemo<ColumnDef<RequisicionRP>[]>(() => [
    {
      header: 'RP',
      accessorKey: 'rp',
      align: 'center',
      cell: (row) => <Text as="span" className="font-mono font-bold text-[var(--color-primary)]">{row.rp || '—'}</Text>,
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
      header: 'N° Pers.',
      accessorKey: 'numero_personas_requeridas',
      align: 'center',
      cell: (row) => <Text as="span">{row.numero_personas_requeridas}</Text>,
    },
    {
      header: 'Ingreso',
      accessorKey: 'fecha_probable_ingreso',
      align: 'center',
      cell: (row) => <Text as="span">{row.fecha_probable_ingreso || '—'}</Text>,
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      align: 'center',
      cell: (row) => <RPStatusBadge estado={row.estado} size="sm" />,
    },
    {
      header: 'Acciones',
      accessorKey: 'id',
      align: 'center',
      enableColumnFilter: false,
      cell: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" onClick={() => onVer(row.id)} title="Ver detalle"
            className="p-1.5 rounded-lg hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={() => { setModal({ tipo: 'aprobar', requisicionId: row.id, rp: row.rp! }); setObservacion(''); }}
            title="Aprobar"
            className="p-1.5 rounded-lg hover:bg-emerald-50 text-[var(--color-text-secondary)] hover:text-emerald-600 transition-colors">
            <CheckCircle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={() => { setModal({ tipo: 'devolver', requisicionId: row.id, rp: row.rp! }); setObservacion(''); }}
            title="Devolver para ajuste"
            className="p-1.5 rounded-lg hover:bg-amber-50 text-[var(--color-text-secondary)] hover:text-amber-600 transition-colors">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={() => { setModal({ tipo: 'rechazar', requisicionId: row.id, rp: row.rp! }); setObservacion(''); }}
            title="Rechazar"
            className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--color-text-secondary)] hover:text-red-600 transition-colors">
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ], [onVer]);

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
              Aprobaciones Pendientes
            </Title>
            <Text variant="caption" color="text-secondary" className="block text-[10px] leading-none uppercase tracking-widest opacity-70 mt-1">
              RECURSOS HUMANOS / APROBACIÓN DE ÁREA
            </Text>
          </div>
        </div>
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
              No tiene requisiciones pendientes de aprobación.
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
              exportFileName="aprobaciones_pendientes_rp.csv"
            />
          </div>
        </div>
      )}

      {/* Modal de confirmación de acción */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] rounded-3xl shadow-2xl border border-[var(--color-border)] p-8 max-w-md w-full mx-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4
              ${modal.tipo === 'aprobar' ? 'bg-emerald-100' : modal.tipo === 'rechazar' ? 'bg-red-100' : 'bg-amber-100'}`}>
              {modal.tipo === 'aprobar' ? <CheckCircle className="w-6 h-6 text-emerald-600" />
                : modal.tipo === 'rechazar' ? <XCircle className="w-6 h-6 text-red-600" />
                : <RotateCcw className="w-6 h-6 text-amber-600" />}
            </div>
            <Title variant="h5" weight="bold" className="mb-1">
              {modal.tipo === 'aprobar' ? 'Aprobar requisición'
                : modal.tipo === 'rechazar' ? 'Rechazar requisición'
                : 'Devolver para ajuste'}
            </Title>
            <Text color="secondary" className="mb-4">Requisición: <strong>{modal.rp}</strong></Text>

            <Textarea
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[100px]"
              placeholder={modal.tipo === 'aprobar' ? 'Observación (opcional)' : 'Observación obligatoria...'}
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
            />

            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setModal(null)}
              >
                Cancelar
              </Button>
              <Button
                variant={modal.tipo === 'aprobar' ? 'custom' : modal.tipo === 'rechazar' ? 'danger' : 'custom'}
                className={`flex-1 ${modal.tipo === 'aprobar' ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500' : modal.tipo === 'devolver' ? 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500' : ''}`}
                onClick={handleAccion}
                disabled={procesando}
                loading={procesando}
              >
                {modal.tipo === 'aprobar' ? 'Confirmar aprobación'
                  : modal.tipo === 'rechazar' ? 'Confirmar rechazo' : 'Confirmar devolución'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BandejaAprobadorRP;
