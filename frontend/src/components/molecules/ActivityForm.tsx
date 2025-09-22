/**
 * Formulario dinámico para actividades de bitácora
 * Se adapta según la etapa seleccionada
 */

import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import Input from '../atoms/Input';
import MaterialSelect from '../atoms/MaterialSelect';
import Button from '../atoms/Button';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { API_ENDPOINTS } from '../../config/api';
import { 
  ActivityLogCreate, 
  StageFieldConfig, 
  STAGE_FIELD_CONFIGS,
  FormField
} from '../../types/activityLog';

interface ActivityFormProps {
  developmentId: string;
  onSuccess?: (activity: any) => void;
  onCancel?: () => void;
  initialStageId?: number;
}

export const ActivityForm: React.FC<ActivityFormProps> = ({
  developmentId,
  onSuccess,
  onCancel,
  initialStageId
}) => {
  const { state } = useAppContext();
  const { darkMode } = state;
  const { get, post } = useApi();

  // Estados del formulario
  const [formData, setFormData] = useState<ActivityLogCreate>({
    stage_id: initialStageId || 0,
    activity_type: 'nueva_actividad',
    start_date: new Date().toISOString().split('T')[0],
    status: 'pendiente',
    actor_type: 'equipo_interno',
    dynamic_payload: {}
  });

  const [stageConfig, setStageConfig] = useState<StageFieldConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableStages, setAvailableStages] = useState<any[]>([]);
  const [alsoMoveStage, setAlsoMoveStage] = useState<boolean>(false);

  // Cargar etapas disponibles
  useEffect(() => {
    const loadStages = async () => {
      try {
        const response = await get(API_ENDPOINTS.STAGES) as any;
        if (Array.isArray(response)) {
          setAvailableStages(response);
        } else {
          setAvailableStages([]);
        }
      } catch (err) {
        console.error('Error cargando etapas:', err);
      }
    };
    loadStages();
  }, [get]);

  // Cargar configuración de campos cuando cambia la etapa
  useEffect(() => {
    if (formData.stage_id && formData.stage_id > 0) {
      loadStageFieldConfig(formData.stage_id);
    }
  }, [formData.stage_id]);

  const loadStageFieldConfig = async (stageId: number) => {
    try {
      setLoading(true);
      const response = await get(API_ENDPOINTS.ACTIVITY_LOG_FIELD_CONFIG(developmentId, stageId)) as any;
      if (response) {
        setStageConfig(response as StageFieldConfig);
      }
    } catch (err) {
      console.error('Error cargando configuración de campos:', err);
      setError('Error cargando configuración de campos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDynamicFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      dynamic_payload: {
        ...prev.dynamic_payload,
        [field]: value
      }
    }));
  };

  const getFormFieldsForStage = (): FormField[] => {
    if (!stageConfig?.field_config) return [];

    const config = STAGE_FIELD_CONFIGS[stageConfig.stage_name];
    if (!config) return [];

    const fields: FormField[] = [];

    // Campos requeridos
    config.required_fields.forEach(fieldName => {
      fields.push({
        name: fieldName,
        label: getFieldLabel(fieldName),
        type: getFieldType(fieldName),
        required: true,
        placeholder: getFieldPlaceholder(fieldName),
        description: getFieldDescription(fieldName)
      });
    });

    // Campos opcionales
    config.optional_fields.forEach(fieldName => {
      fields.push({
        name: fieldName,
        label: getFieldLabel(fieldName),
        type: getFieldType(fieldName),
        required: false,
        placeholder: getFieldPlaceholder(fieldName),
        description: getFieldDescription(fieldName)
      });
    });

    return fields;
  };

  const getFieldLabel = (fieldName: string): string => {
    const labels: Record<string, string> = {
      proposal_id: 'Número de Propuesta',
      proposal_version: 'Versión de Propuesta',
      approver: 'Aprobador',
      approval_date: 'Fecha de Aprobación',
      budget_approved: 'Presupuesto Aprobado',
      side_case_id: 'Caso SIDE',
      servicepoint_case_id: 'Caso ServicePoint',
      analyst_assigned: 'Analista Asignado',
      scope_analysis: 'Alcance del Análisis',
      requirements_count: 'Número de Requerimientos',
      installer_number: 'Número de Instalador',
      environment: 'Ambiente',
      change_window: 'Ventana de Cambio',
      installation_notes: 'Notas de Instalación'
    };
    return labels[fieldName] || fieldName;
  };

  const getFieldType = (fieldName: string): 'text' | 'number' | 'date' | 'select' | 'textarea' => {
    if (fieldName.includes('date')) return 'date';
    if (fieldName.includes('count') || fieldName.includes('number')) return 'number';
    if (fieldName.includes('notes') || fieldName.includes('analysis')) return 'textarea';
    if (fieldName === 'environment') return 'select';
    return 'text';
  };

  const getFieldPlaceholder = (fieldName: string): string => {
    const placeholders: Record<string, string> = {
      proposal_id: 'Ej: PROP-2024-001',
      side_case_id: 'Ej: SIDE-12345',
      servicepoint_case_id: 'Ej: SP-67890',
      installer_number: 'Ej: INST-001',
      environment: 'Seleccionar ambiente'
    };
    return placeholders[fieldName] || '';
  };

  const getFieldDescription = (fieldName: string): string => {
    const descriptions: Record<string, string> = {
      proposal_id: 'Identificador único de la propuesta técnica',
      side_case_id: 'Número del caso en el sistema SIDE',
      servicepoint_case_id: 'Número del caso en ServicePoint',
      installer_number: 'Número único del instalador asignado'
    };
    return descriptions[fieldName] || '';
  };

  const getEnvironmentOptions = () => [
    { value: 'desarrollo', label: 'Desarrollo' },
    { value: 'pruebas', label: 'Pruebas' },
    { value: 'staging', label: 'Staging' },
    { value: 'produccion', label: 'Producción' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await post(
        API_ENDPOINTS.ACTIVITY_LOG_CREATE(developmentId),
        formData
      );

      if (response) {
        // Si el usuario marcó "mover etapa", invocar endpoint de cierre de etapa
        if (alsoMoveStage && formData.stage_id) {
          try {
            await post(
              API_ENDPOINTS.DEVELOPMENT_STAGE_CLOSE(developmentId),
              {
                stage_id: formData.stage_id,
                actual_date: formData.end_date || formData.start_date,
                planned_date: formData.start_date
              }
            );
          } catch (err) {
            console.error('Error al mover la etapa:', err);
          }
        }
        
        onSuccess?.(response);
        // Reset form
        setFormData({
          stage_id: 0,
          activity_type: 'nueva_actividad',
          start_date: new Date().toISOString().split('T')[0],
          status: 'pendiente',
          actor_type: 'equipo_interno',
          dynamic_payload: {}
        });
        setStageConfig(null);
        setAlsoMoveStage(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error creando actividad');
    } finally {
      setLoading(false);
    }
  };

  const renderDynamicField = (field: FormField) => {
    const value = formData.dynamic_payload?.[field.name] || '';

    switch (field.type) {
      case 'select':
        return (
          <MaterialSelect
            label={field.label}
            name={field.name}
            value={value}
            onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
            darkMode={darkMode}
            options={field.name === 'environment' ? getEnvironmentOptions() : []}
            required={field.required}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md ${
              darkMode 
                ? 'bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400' 
                : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        );
      default: {
        const inputType = (field.type === 'date' || field.type === 'number' || field.type === 'text')
          ? field.type
          : 'text';
        return (
          <Input
            type={inputType}
            value={value}
            onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      }
    }
  };

  return (
    <div className={`${
      darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
    } border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-semibold flex items-center ${
          darkMode ? 'text-white' : 'text-neutral-900'
        }`}>
          <Plus className="mr-2" size={20} />
          Nueva Actividad
        </h3>
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X size={16} />
          </Button>
        )}
      </div>

      {error && (
        <div className={`mb-4 p-3 rounded-md ${
          darkMode ? 'bg-red-900/20 text-red-300 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campos básicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-neutral-300' : 'text-neutral-700'
            }`}>
              Etapa *
            </label>
            <MaterialSelect
              label="Etapa"
              name="stage_id"
              value={formData.stage_id.toString()}
              onChange={(e) => handleInputChange('stage_id', parseInt(e.target.value))}
              darkMode={darkMode}
              options={availableStages.map(stage => ({
                value: stage.id.toString(),
                label: stage.stage_name
              }))}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-neutral-300' : 'text-neutral-700'
            }`}>
              Tipo de Actor *
            </label>
            <MaterialSelect
              label="Tipo de Actor"
              name="actor_type"
              value={formData.actor_type}
              onChange={(e) => handleInputChange('actor_type', e.target.value)}
              darkMode={darkMode}
              options={[
                { value: 'equipo_interno', label: 'Equipo Interno' },
                { value: 'proveedor', label: 'Proveedor' },
                { value: 'usuario', label: 'Usuario' }
              ]}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-neutral-300' : 'text-neutral-700'
            }`}>
              Fecha de Inicio *
            </label>
            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-neutral-300' : 'text-neutral-700'
            }`}>
              Fecha de Fin
            </label>
            <Input
              type="date"
              value={formData.end_date || ''}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-neutral-300' : 'text-neutral-700'
            }`}>
              Próximo Seguimiento
            </label>
            <Input
              type="date"
              value={formData.next_follow_up_at || ''}
              onChange={(e) => handleInputChange('next_follow_up_at', e.target.value)}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-neutral-300' : 'text-neutral-700'
            }`}>
              Estado
            </label>
            <MaterialSelect
              label="Estado"
              name="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              darkMode={darkMode}
              options={[
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'en_curso', label: 'En Curso' },
                { value: 'completada', label: 'Completada' },
                { value: 'cancelada', label: 'Cancelada' }
              ]}
            />
          </div>
        </div>

        {/* Campos dinámicos por etapa */}
        {stageConfig?.has_dynamic_fields && (
          <div className={`${
            darkMode ? 'bg-neutral-700/50' : 'bg-neutral-50'
          } rounded-lg p-4`}>
            <h4 className={`text-md font-medium mb-4 ${
              darkMode ? 'text-white' : 'text-neutral-900'
            }`}>
              Campos específicos para: {stageConfig.stage_name}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getFormFieldsForStage().map((field) => (
                <div key={field.name}>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-neutral-300' : 'text-neutral-700'
                  }`}>
                    {field.label} {field.required && '*'}
                  </label>
                  {renderDynamicField(field)}
                  {field.description && (
                    <p className={`text-xs mt-1 ${
                      darkMode ? 'text-neutral-400' : 'text-neutral-500'
                    }`}>
                      {field.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-neutral-300' : 'text-neutral-700'
          }`}>
            Notas Adicionales
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Descripción detallada de la actividad..."
            rows={3}
            className={`w-full px-3 py-2 border rounded-md ${
              darkMode 
                ? 'bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400' 
                : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        {/* Acción: también mover la etapa */}
        <div className="flex items-center">
          <input
            id="alsoMoveStage"
            type="checkbox"
            checked={alsoMoveStage}
            onChange={(e) => setAlsoMoveStage(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="alsoMoveStage" className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'} text-sm`}>
            También mover el desarrollo a esta etapa
          </label>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creando...
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                Crear Actividad
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
