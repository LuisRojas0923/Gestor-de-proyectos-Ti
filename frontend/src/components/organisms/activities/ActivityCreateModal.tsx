import React, { useState, useEffect } from 'react';
import { Button, Title, Text } from '../../atoms';
import { X } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';
import { API_ENDPOINTS } from '../../../config/api';
import { useWizard, WizardStep } from './hooks/useWizard';
import { useActivityValidation, ActivityFormData, FollowUpConfig } from './hooks/useActivityValidation';
import { WizardProgressIndicator } from './components/WizardProgressIndicator';
import { WizardStep1 } from './components/WizardStep1';
import { WizardStep2 } from './components/WizardStep2';
import { WizardStep3 } from './components/WizardStep3';
import { Modal } from '../../molecules';

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
  const { validateStep, validateAllSteps } = useActivityValidation();

  // Form data state
  const [formData, setFormData] = useState<ActivityFormData>({
    stageId: defaultStageId || 1,
    activityType: 'seguimiento',
    actorType: 'equipo_interno',
    status: 'pendiente',
    startDate: '',
    endDate: '',
    followUpConfig: {
      enabled: false,
      type: 'before_start',
      days: undefined,
      interval: undefined,
      endDate: undefined,
    },
    notes: '',
    dynamicPayload: {},
  });

  // API state
  const [stages, setStages] = useState<Array<{ id: number; stage_name: string; stage_code: string }>>([]);
  const [fieldConfig, setFieldConfig] = useState<StageFieldConfigResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Wizard steps configuration
  const steps: WizardStep[] = [
    {
      id: 1,
      title: 'Información Básica',
      description: 'Etapa, tipo y actor',
      isValid: !!formData.stageId && !!formData.activityType && !!formData.actorType && !!formData.status && !!formData.startDate
    },
    {
      id: 2,
      title: 'Fechas y Tiempo',
      description: 'Planificación temporal',
      isValid: !!formData.startDate && (!formData.endDate || formData.startDate <= formData.endDate)
    },
    {
      id: 3,
      title: 'Detalles Adicionales',
      description: 'Notas y campos específicos',
      isValid: true // Always valid, optional fields
    }
  ];

  const requiredFields = fieldConfig?.required_fields || [];

  // Wizard hook
  const {
    currentStep,
    canGoPrevious,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    isLastStep,
    currentStepData,
  } = useWizard({
    steps,
    onStepChange: () => setErrors([]) // Clear errors when changing steps
  });

  // Load stages and field config
  useEffect(() => {
    if (!isOpen) return;

    const loadConfig = async () => {
      const resp = await get(API_ENDPOINTS.ACTIVITY_LOG_FIELD_CONFIG(developmentId, formData.stageId));
      setFieldConfig(resp as StageFieldConfigResponse);
    };
    loadConfig();
  }, [isOpen, formData.stageId, developmentId, get]);

  useEffect(() => {
    if (!isOpen) return;

    const loadStages = async () => {
      const list = await get(API_ENDPOINTS.STAGES);
      if (Array.isArray(list)) {
        const mappedStages = list.map((s: { id: number; stage_name?: string; name?: string; stage?: string; stage_code?: string }) => ({
          id: s.id,
          stage_name: s.stage_name || String(s.name || s.stage || s.id),
          stage_code: s.stage_code || ''
        }));

        // Ordenar por stage_code
        const sortedStages = mappedStages.sort((a, b) => {
          return a.stage_code.localeCompare(b.stage_code);
        });

        setStages(sortedStages);
      }
    };
    loadStages();
  }, [isOpen, get]);

  // Reset wizard when modal closes
  useEffect(() => {
    if (!isOpen) {
      setErrors([]);
      setFormData({
        stageId: defaultStageId || 1,
        activityType: 'seguimiento',
        actorType: 'equipo_interno',
        status: 'pendiente',
        startDate: '',
        endDate: '',
        followUpConfig: {
          enabled: false,
          type: 'before_start',
          days: undefined,
          interval: undefined,
          endDate: undefined,
        },
        notes: '',
        dynamicPayload: {},
      });
    }
  }, [isOpen, defaultStageId]);

  // Form handlers
  const handleStageChange = (stageId: number) => {
    setFormData(prev => ({ ...prev, stageId }));
  };

  const handleActivityTypeChange = (activityType: string) => {
    setFormData(prev => ({ ...prev, activityType }));
  };

  const handleActorTypeChange = (actorType: string) => {
    setFormData(prev => ({ ...prev, actorType }));
  };

  const handleStatusChange = (status: string) => {
    setFormData(prev => ({ ...prev, status }));
  };

  const handleStartDateChange = (startDate: string) => {
    setFormData(prev => ({ ...prev, startDate }));
  };

  const handleEndDateChange = (endDate: string) => {
    setFormData(prev => ({ ...prev, endDate }));
  };

  const handleFollowUpConfigChange = (followUpConfig: FollowUpConfig) => {
    setFormData(prev => ({ ...prev, followUpConfig }));
  };

  const handleNotesChange = (notes: string) => {
    setFormData(prev => ({ ...prev, notes }));
  };

  const handleDynamicFieldChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      dynamicPayload: { ...prev.dynamicPayload, [key]: value }
    }));
  };

  // Navigation with validation
  const handleNextStep = () => {
    const stepErrors = validateStep(currentStep, formData, requiredFields);
    if (stepErrors.isValid) {
      goToNextStep();
    } else {
      setErrors(stepErrors.errors);
    }
  };

  const handlePreviousStep = () => {
    goToPreviousStep();
  };

  const handleStepClick = (step: number) => {
    // Validate current step before allowing navigation
    const currentStepErrors = validateStep(currentStep, formData, requiredFields);
    if (currentStepErrors.isValid || step < currentStep) {
      goToStep(step);
    } else {
      setErrors(currentStepErrors.errors);
    }
  };

  // Submit function
  const handleSubmit = async () => {
    const validation = validateAllSteps(formData, requiredFields);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      // Calcular la próxima fecha de seguimiento basada en la configuración
      const calculateNextFollowUp = () => {
        if (!formData.followUpConfig.enabled || !formData.followUpConfig.type) return undefined;

        const { type, days, interval } = formData.followUpConfig;
        const startDateObj = formData.startDate ? new Date(formData.startDate) : null;
        const endDateObj = formData.endDate ? new Date(formData.endDate) : null;

        if (type === 'before_start' && startDateObj && days) {
          const followUpDate = new Date(startDateObj);
          followUpDate.setDate(followUpDate.getDate() - days);
          return followUpDate.toISOString().split('T')[0];
        }

        if (type === 'before_end' && endDateObj && days) {
          const followUpDate = new Date(endDateObj);
          followUpDate.setDate(followUpDate.getDate() - days);
          return followUpDate.toISOString().split('T')[0];
        }

        if (type === 'after_start' && startDateObj && interval) {
          const followUpDate = new Date(startDateObj);
          followUpDate.setDate(followUpDate.getDate() + interval);
          return followUpDate.toISOString().split('T')[0];
        }

        if (type === 'after_end' && endDateObj && interval) {
          const followUpDate = new Date(endDateObj);
          followUpDate.setDate(followUpDate.getDate() + interval);
          return followUpDate.toISOString().split('T')[0];
        }

        return undefined;
      };

      const body = {
        activity_type: formData.activityType,
        actor_type: formData.actorType,
        stage_id: formData.stageId,
        status: formData.status,
        start_date: formData.startDate, // Obligatorio según el backend
        notes: formData.notes || undefined,
        end_date: formData.endDate || undefined,
        next_follow_up_at: calculateNextFollowUp(),
        follow_up_config: formData.followUpConfig.enabled ? formData.followUpConfig : undefined,
        dynamic_payload: formData.dynamicPayload,
      };

      const resp = await post(API_ENDPOINTS.ACTIVITY_LOG_CREATE(developmentId), body);
      if (resp) {
        onCreated();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <WizardStep1
            stageId={formData.stageId}
            activityType={formData.activityType}
            actorType={formData.actorType}
            status={formData.status}
            startDate={formData.startDate}
            stages={stages}
            onStageChange={handleStageChange}
            onActivityTypeChange={handleActivityTypeChange}
            onActorTypeChange={handleActorTypeChange}
            onStatusChange={handleStatusChange}
            onStartDateChange={handleStartDateChange}
            darkMode={darkMode}
          />
        );
      case 2:
        return (
          <WizardStep2
            startDate={formData.startDate}
            endDate={formData.endDate}
            followUpConfig={formData.followUpConfig}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onFollowUpConfigChange={handleFollowUpConfigChange}
            darkMode={darkMode}
          />
        );
      case 3:
        return (
          <WizardStep3
            notes={formData.notes}
            dynamicPayload={formData.dynamicPayload}
            fieldConfig={fieldConfig}
            requiredFields={requiredFields}
            onNotesChange={handleNotesChange}
            onDynamicFieldChange={handleDynamicFieldChange}
            darkMode={darkMode}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      showCloseButton={false}
    >
      <div className="max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 rounded-lg overflow-hidden">
        {/* Header with progress indicator */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Title variant="h6" className={darkMode ? 'text-white' : 'text-neutral-900'}>
                Nueva Actividad
              </Title>
              <Text variant="caption" className={darkMode ? 'text-neutral-400' : 'text-neutral-600'}>
                Paso {currentStep} de {steps.length}: {currentStepData.title}
              </Text>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={onClose}
              className={`${darkMode ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
            >
              {""}
            </Button>
          </div>

          <WizardProgressIndicator
            steps={steps}
            currentStep={currentStep}
            onStepClick={handleStepClick}
            darkMode={darkMode}
            disabled={loading}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="p-4">
            <div className="mb-4">
              <Title variant="h6" weight="medium" className={darkMode ? 'text-white' : 'text-neutral-900'}>
                {currentStepData.title}
              </Title>
              <Text variant="body2" className={darkMode ? 'text-neutral-400' : 'text-neutral-600'}>
                {currentStepData.description}
              </Text>
            </div>

            {renderStepContent()}

            {/* Error display */}
            {errors.length > 0 && (
              <div className={`mt-4 p-3 rounded-md ${darkMode ? 'bg-red-900/20 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                <ul className="list-disc pl-5 text-sm">
                  {errors.map((error, i) => (<li key={i}>{error}</li>))}
                </ul>
              </div>
            )}
          </div>
        </div>
        {/* Actions */}
        <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-6 py-4">
          <div className="flex justify-between w-full">
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              {canGoPrevious() && (
                <Button
                  variant="secondary"
                  onClick={handlePreviousStep}
                  disabled={loading}
                >
                  Anterior
                </Button>
              )}
            </div>

            <div>
              {!isLastStep ? (
                <Button
                  variant="primary"
                  onClick={handleNextStep}
                  disabled={loading}
                  className={`${darkMode ? '!bg-blue-600 hover:!bg-blue-700 text-white' : '!bg-blue-600 hover:!bg-blue-700 text-white'}`}
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`${darkMode ? '!bg-green-600 hover:!bg-green-700 text-white' : '!bg-green-600 hover:!bg-green-700 text-white'}`}
                >
                  {loading ? 'Creando...' : 'Crear Actividad'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ActivityCreateModal;