import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck, XCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, MaterialCard, Text, Textarea, Title } from '../components/atoms';
import { ValidationStatusBadge } from '../components/assignments/ValidationStatusBadge';
import { useApi } from '../hooks/useApi';
import { AssignmentValidation } from '../types/hierarchy';

const AssignmentValidations: React.FC = () => {
  const navigate = useNavigate();
  const { get, post } = useApi<AssignmentValidation[] | AssignmentValidation>();
  const [validations, setValidations] = useState<AssignmentValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [observacion, setObservacion] = useState('');

  const fetchValidations = async () => {
    setLoading(true);
    try {
      const data = await get('/validaciones-asignacion?estado=pendiente');
      setValidations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading assignment validations:', error);
      setValidations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchValidations();
  }, []);

  const resolveValidation = async (id: number, estado: 'aprobada' | 'rechazada') => {
    setSavingId(id);
    try {
      await post(`/validaciones-asignacion/${id}/resolver`, {
        estado,
        observacion: estado === 'rechazada' ? observacion : 'Aprobado desde bandeja de validaciones',
      });
      setRejectingId(null);
      setObservacion('');
      await fetchValidations();
    } catch (error) {
      console.error('Error resolving assignment validation:', error);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-10 animate-in fade-in duration-500">
      {/* Banner Header */}
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/service-portal/gestion-actividades')}
            className="text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-variant)] px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
          >
            ← Volver
          </Button>
          <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
          <Title variant="h1" weight="bold" color="text-primary">Aprobaciones de asignación</Title>
          <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Text as="span" variant="caption" weight="bold" className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full border border-primary-100 dark:border-primary-800/50">
              {validations.length} Pendientes
            </Text>
          </div>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={fetchValidations} disabled={loading}>
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MaterialCard className="p-5">
          <Text variant="caption" weight="bold" color="text-secondary">Pendientes</Text>
          <Title variant="h3" weight="bold" color="text-primary">{validations.length}</Title>
        </MaterialCard>
        <MaterialCard className="p-5 md:col-span-2">
          <Text variant="body2" color="text-secondary">
            Si apruebas, la tarea queda activa para el ejecutor. Si rechazas, queda trazabilidad y observación para seguimiento.
          </Text>
        </MaterialCard>
      </div>

      {loading ? (
        <MaterialCard className="p-8 text-center">
          <Text color="text-secondary">Cargando aprobaciones pendientes...</Text>
        </MaterialCard>
      ) : validations.length === 0 ? (
        <MaterialCard className="p-10 text-center">
          <Badge variant="success" size="lg" className="mb-4">Sin pendientes</Badge>
          <Title variant="h5" weight="bold" color="text-primary">Todo está al día</Title>
          <Text variant="body2" color="text-secondary">No tienes asignaciones pendientes por revisar.</Text>
        </MaterialCard>
      ) : (
        <div className="space-y-4">
          {validations.map((validation) => (
            <MaterialCard key={validation.id} className="relative overflow-hidden" elevation={2}>
              {/* Decoración: Gradiente y Marca de Agua */}
              <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent blur-3xl" />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                <ShieldCheck size={180} strokeWidth={1} />
              </div>

              <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ValidationStatusBadge status={validation.estado} />
                    <Text variant="caption" color="text-secondary">Validación #{validation.id}</Text>
                  </div>
                  <Title variant="h6" weight="bold" color="text-primary">
                    {validation.actividad_titulo || `Actividad ${validation.actividad_id}`} 
                    {' · '} 
                    {validation.desarrollo_nombre || `Desarrollo ${validation.desarrollo_id}`}
                  </Title>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <InfoPill 
                      label="Solicitado por" 
                      value={validation.solicitado_por_nombre || validation.solicitado_por_id} 
                    />
                    <InfoPill 
                      label="Líder de actividad" 
                      value={validation.asignado_a_nombre || validation.asignado_a_id} 
                    />
                    <InfoPill 
                      label="Validador" 
                      value={validation.validador_nombre || validation.validador_id} 
                    />
                  </div>
                  {rejectingId === validation.id && (
                    <Textarea
                      label="Motivo del rechazo"
                      placeholder="Explica brevemente por qué no se aprueba esta asignación..."
                      value={observacion}
                      onChange={(event) => setObservacion(event.target.value)}
                    />
                  )}
                </div>

                <div className="flex w-full flex-col gap-2 lg:w-56">
                  <Button
                    variant="primary"
                    icon={CheckCircle2}
                    disabled={savingId === validation.id}
                    onClick={() => resolveValidation(validation.id, 'aprobada')}
                  >
                    Aprobar
                  </Button>
                  {rejectingId === validation.id ? (
                    <Button
                      variant="danger"
                      icon={XCircle}
                      disabled={savingId === validation.id || !observacion.trim()}
                      onClick={() => resolveValidation(validation.id, 'rechazada')}
                    >
                      Confirmar rechazo
                    </Button>
                  ) : (
                    <Button variant="outline" icon={XCircle} onClick={() => setRejectingId(validation.id)}>
                      Rechazar
                    </Button>
                  )}
                </div>
              </div>
            </MaterialCard>
          ))}
        </div>
      )}
    </div>
  );
};

const InfoPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-variant)]/50 p-3">
    <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wide">{label}</Text>
    <Text variant="body2" weight="bold" color="text-primary" className="mt-1 truncate">{value}</Text>
  </div>
);

export default AssignmentValidations;
