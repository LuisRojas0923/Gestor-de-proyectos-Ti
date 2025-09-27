import React, { useEffect, useMemo, useState } from 'react';
import { MaterialButton, MaterialCard } from '../../../../components/atoms';
import { useApi } from '../../../../hooks/useApi';
import { API_ENDPOINTS } from '../../../../config/api';

interface ActivityCreateModalProps {
  isOpen: boolean;
  developmentId: string;
  defaultStageId?: number | null;
  darkMode: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface StageFieldConfigResponse {
  stage_id: number;
  stage_name: string;
  stage_code: string;
  has_dynamic_fields: boolean;
  required_fields: string[];
  optional_fields: string[];
}

export const ActivityCreateModal: React.FC<ActivityCreateModalProps> = ({
  isOpen,
  developmentId,
  defaultStageId,
  darkMode,
  onClose,
  onCreated,
}) => {
  const { get, post } = useApi<StageFieldConfigResponse>();

  const [stages, setStages] = useState<Array<{ id: number; stage_name: string }>>([]);
  const [stageId, setStageId] = useState<number>(defaultStageId || 1);
  const [activityType, setActivityType] = useState<'nueva_actividad' | 'seguimiento' | 'cierre_etapa' | 'cambio_etapa' | 'observacion'>('seguimiento');
  const [actorType, setActorType] = useState<'equipo_interno' | 'proveedor' | 'usuario' | 'sistema'>('equipo_interno');
  const [status, setStatus] = useState<'pendiente' | 'en_curso' | 'completada' | 'cancelada'>('pendiente');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');
  const [dynamicPayload, setDynamicPayload] = useState<Record<string, string>>({});
  const [fieldConfig, setFieldConfig] = useState<StageFieldConfigResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const loadConfig = async () => {
      const resp = await get(API_ENDPOINTS.ACTIVITY_LOG_FIELD_CONFIG(developmentId, stageId));
      setFieldConfig(resp as StageFieldConfigResponse);
    };
    loadConfig();
  }, [isOpen, stageId, developmentId, get]);

  // Cargar catálogo de etapas para selector (id + nombre)
  useEffect(() => {
    if (!isOpen) return;
    const loadStages = async () => {
      const list = await get(API_ENDPOINTS.STAGES);
      if (Array.isArray(list)) {
        setStages(list.map((s: { id: number; stage_name?: string; name?: string; stage?: string }) => ({ 
          id: s.id, 
          stage_name: s.stage_name || String(s.name || s.stage || s.id) 
        })));
      }
    };
    loadStages();
  }, [isOpen, get]);

  const requiredFields = useMemo(() => fieldConfig?.required_fields || [], [fieldConfig]);

  const validate = useMemo(() => () => {
    const e: string[] = [];
    if (startDate && endDate && startDate > endDate) e.push('La fecha de inicio no puede ser mayor que la fecha de fin.');
    if (nextFollowUpAt && startDate && nextFollowUpAt < startDate) e.push('El próximo seguimiento no puede ser anterior a la fecha de inicio.');
    for (const f of requiredFields) {
      const v = dynamicPayload[f];
      if (v === undefined || v === null || String(v).trim() === '') e.push(`Campo requerido: ${f}`);
    }
    setErrors(e);
    return e.length === 0;
  }, [startDate, endDate, nextFollowUpAt, requiredFields, dynamicPayload]);

  const onChangeDynamic = (key: string, value: string) => {
    setDynamicPayload(prev => ({ ...prev, [key]: value }));
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    const body = {
      activity_type: activityType,
      actor_type: actorType,
      stage_id: stageId,
      status,
      notes: notes || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      next_follow_up_at: nextFollowUpAt || undefined,
      dynamic_payload: Object.keys(dynamicPayload).length ? dynamicPayload : undefined,
    };
    const resp = await post(API_ENDPOINTS.ACTIVITY_LOG_CREATE(developmentId), body);
    setLoading(false);
    if (resp) {
      onCreated();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`${darkMode ? 'bg-black/60' : 'bg-black/40'} fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4`}>
      <MaterialCard elevation={8} className="w-full sm:max-w-2xl h-[90vh] sm:h-auto sm:max-h-[80vh] flex flex-col" darkMode={darkMode}>
        <MaterialCard.Header>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>Nueva Actividad</h3>
        </MaterialCard.Header>
        <MaterialCard.Content>
          <div className="flex-1 overflow-y-auto pr-1 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Etapa</label>
              <select
                value={stageId}
                onChange={(e) => setStageId(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
              >
                {stages.length === 0 && <option value={stageId}>{`${stageId}`}</option>}
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{`${s.id}. ${s.stage_name}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Tipo</label>
              <select value={activityType} onChange={(e) => setActivityType(e.target.value as 'nueva_actividad' | 'seguimiento' | 'cierre_etapa' | 'cambio_etapa' | 'observacion')} className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}>
                <option value="nueva_actividad">Nueva actividad</option>
                <option value="seguimiento">Seguimiento</option>
                <option value="cierre_etapa">Cierre de etapa</option>
                <option value="cambio_etapa">Cambio de etapa</option>
                <option value="observacion">Observación</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Actor</label>
              <select value={actorType} onChange={(e) => setActorType(e.target.value as 'equipo_interno' | 'proveedor' | 'usuario' | 'sistema')} className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}>
                <option value="equipo_interno">Equipo Interno</option>
                <option value="proveedor">Proveedor</option>
                <option value="usuario">Usuario</option>
                <option value="sistema">Sistema</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Estado</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as 'pendiente' | 'en_curso' | 'completada' | 'cancelada')} className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}>
                <option value="pendiente">Pendiente</option>
                <option value="en_curso">En curso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Inicio</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Fin</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Próximo seguimiento</label>
              <input type="date" value={nextFollowUpAt} onChange={(e) => setNextFollowUpAt(e.target.value)} className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`} />
            </div>
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Notas</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`} />
            </div>
            </div>

            {/* Campos dinámicos */}
            {fieldConfig && requiredFields.length > 0 && (
              <div className="mt-4">
                <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>Campos específicos requeridos de la etapa</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requiredFields.map((f) => (
                    <div key={`req-${f}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>{f} (requerido)</label>
                      <input value={dynamicPayload[f] || ''} onChange={(e) => onChangeDynamic(f, e.target.value)} className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errors.length > 0 && (
              <div className={`mt-4 p-3 rounded-md ${darkMode ? 'bg-red-900/20 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                <ul className="list-disc pl-5 text-sm">
                  {errors.map((e, i) => (<li key={i}>{e}</li>))}
                </ul>
              </div>
            )}
          </div>
        </MaterialCard.Content>
        <MaterialCard.Actions className="sticky bottom-0 z-10">
          <MaterialButton variant="outlined" color="inherit" onClick={onClose} disabled={loading}>Cancelar</MaterialButton>
          <MaterialButton variant="contained" onClick={onSubmit} disabled={loading} className={`${darkMode ? '!bg-blue-600 hover:!bg-blue-700 text-white' : '!bg-blue-600 hover:!bg-blue-700 text-white'}`}>Crear</MaterialButton>
        </MaterialCard.Actions>
      </MaterialCard>
    </div>
  );
};

export default ActivityCreateModal;


