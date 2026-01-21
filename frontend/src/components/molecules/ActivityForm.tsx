/**
 * Formulario dinámico para actividades de bitácora
 * Se adapta según la etapa seleccionada
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input, Select, Textarea, Checkbox, Title, Text, MaterialCard } from '../atoms';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { API_ENDPOINTS } from '../../config/api';
import {
  ActivityLogCreate,
  StageFieldConfig,
  FormField
} from '../../types/activityLog';
import { Activity } from '../../types/activity';

interface ActivityFormProps {
  developmentId: string;
  onSuccess?: (activity: Activity) => void;
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
  const [availableStages, setAvailableStages] = useState<{ id: number, stage_name: string }[]>([]);
  const [alsoMoveStage, setAlsoMoveStage] = useState<boolean>(true); // Por defecto marcado

  const loadStageFieldConfig = useCallback(async (stageId: number) => {
    try {
      setLoading(true);
      const response = await get(API_ENDPOINTS.ACTIVITY_LOG_FIELD_CONFIG(developmentId, stageId));
      if (response) {
        setStageConfig(response as StageFieldConfig);
      }
    } catch (err) {
      console.error('Error cargando configuración de campos:', err);
      setError('Error cargando configuración de campos');
    } finally {
      setLoading(false);
    }
  }, [developmentId, get]);

  // Cargar etapas disponibles
  useEffect(() => {
    const loadStages = async () => {
      try {
        const response = await get(API_ENDPOINTS.STAGES);
        if (Array.isArray(response)) {
          setAvailableStages(response as { id: number, stage_name: string }[]);
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
  }, [formData.stage_id, loadStageFieldConfig]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDynamicFieldChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      dynamic_payload: {
        ...(prev.dynamic_payload || {}),
        [field]: value
      }
    }));
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

  const getFormFieldsForStage = (): FormField[] => {
    if (!stageConfig?.has_dynamic_fields) return [];

    const fields: FormField[] = [];

    // Usar la configuración de campos devuelta por el API si existe, sino campos básicos
    const requiredFields = stageConfig.required_fields || [];
    const optionalFields = stageConfig.optional_fields || [];

    requiredFields.forEach(fieldName => {
      fields.push({
        name: fieldName,
        label: getFieldLabel(fieldName),
        type: getFieldType(fieldName),
        required: true,
        placeholder: getFieldPlaceholder(fieldName),
        description: getFieldDescription(fieldName)
      });
    });

    optionalFields.forEach(fieldName => {
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
      // Validación de etapa seleccionada
      if (!formData.stage_id || formData.stage_id <= 0) {
        setError('Selecciona una etapa válida para la actividad.');
        setLoading(false);
        return;
      }
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

        onSuccess?.(response as Activity);
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
        setAlsoMoveStage(true); // Mantener marcado por defecto
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Error creando actividad');
    } finally {
      setLoading(false);
    }
  };

  const renderDynamicField = (field: FormField) => {
    const rawValue = formData.dynamic_payload?.[field.name];
    const value = (typeof rawValue === 'string' || typeof rawValue === 'number') ? String(rawValue) : '';

    switch (field.type) {
      case 'select':
        return (
          <Select
            label={field.label}
            value={value}
            onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
            options={field.name === 'environment' ? getEnvironmentOptions() : []}
            required={field.required}
          />
        );
      case 'textarea':
        return (
          <Textarea
            label={field.label}
            value={value}
            onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
          />
        );
      default: {
        const inputType = (field.type === 'date' || field.type === 'number' || field.type === 'text')
          ? field.type
          : 'text';
        return (
          <Input
            type={inputType}
            label={`${field.label}${field.required ? ' *' : ''}`}
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
    <MaterialCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Title variant="h4" weight="semibold" className="flex items-center">
          <Plus className="mr-2" size={20} />
          Nueva Actividad
        </Title>
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
        <div className={`mb-4 p-3 rounded-md ${darkMode ? 'bg-red-900/20 text-red-300 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
          <Text>{error}</Text>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campos básicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Etapa *"
              value={formData.stage_id.toString()}
              onChange={(e) => handleInputChange('stage_id', parseInt(e.target.value))}
              options={availableStages.map(stage => ({
                value: stage.id.toString(),
                label: stage.stage_name
              }))}
              required
            />
          </div>

          <div>
            <Select
              label="Tipo de Actor *"
              value={formData.actor_type}
              onChange={(e) => handleInputChange('actor_type', e.target.value)}
              options={[
                { value: 'equipo_interno', label: 'Equipo Interno' },
                { value: 'proveedor', label: 'Proveedor' },
                { value: 'usuario', label: 'Usuario' }
              ]}
              required
            />
          </div>

          <div>
            <Input
              type="date"
              label="Fecha de Inicio *"
              value={formData.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              type="date"
              label="Fecha de Fin"
              value={formData.end_date || ''}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
            />
          </div>

          <div>
            <Input
              type="date"
              label="Próximo Seguimiento"
              value={formData.next_follow_up_at || ''}
              onChange={(e) => handleInputChange('next_follow_up_at', e.target.value)}
            />
          </div>

          <div>
            <Select
              label="Estado"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
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
          <div className={`${darkMode ? 'bg-neutral-700/50' : 'bg-neutral-50'} rounded-lg p-4`}>
            <Title variant="h6" weight="medium" className="mb-4">
              Campos específicos para: {stageConfig.stage_name}
            </Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getFormFieldsForStage().map((field) => (
                <div key={field.name}>
                  {renderDynamicField(field)}
                  {field.description && (
                    <Text variant="caption" color="secondary" className="mt-1">
                      {field.description}
                    </Text>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        <div>
          <Textarea
            label="Notas Adicionales"
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Descripción detallada de la actividad..."
            rows={3}
          />
        </div>

        {/* Acción: también mover la etapa */}
        <div className="flex items-center">
          <Checkbox
            id="alsoMoveStage"
            checked={alsoMoveStage}
            onChange={(e) => setAlsoMoveStage(e.target.checked)}
            label="También mover el desarrollo a esta etapa"
          />
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
            loading={loading}
            icon={Plus}
          >
            {loading ? 'Creando...' : 'Crear Actividad'}
          </Button>
        </div>
      </form>
    </MaterialCard>
  );
};
