import { useMemo } from 'react';

export interface FollowUpConfig {
  enabled: boolean;
  type: 'before_start' | 'after_start' | 'before_end' | 'after_end';
  days?: number; // Para "antes de" (ej: 2 días antes)
  interval?: number; // Para "después de" (ej: cada 3 días)
  endDate?: string; // Fecha límite para seguimiento recurrente
}

export interface ActivityFormData {
  stageId: number;
  activityType: string;
  actorType: string;
  status: string;
  startDate: string;
  endDate: string;
  followUpConfig: FollowUpConfig;
  notes: string;
  dynamicPayload: Record<string, string>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const useActivityValidation = () => {
  const validateStep = useMemo(() => (step: number, formData: ActivityFormData, requiredFields: string[]): ValidationResult => {
    const errors: string[] = [];
    
    switch (step) {
      case 1:
        if (!formData.stageId) errors.push('La etapa es requerida');
        if (!formData.activityType) errors.push('El tipo de actividad es requerido');
        if (!formData.actorType) errors.push('El actor es requerido');
        if (!formData.status) errors.push('El estado es requerido');
        if (!formData.startDate) errors.push('La fecha de inicio es requerida');
        break;
        
      case 2:
        if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
          errors.push('La fecha de inicio no puede ser mayor que la fecha de fin');
        }
        
        // Validar configuración de seguimiento
        if (formData.followUpConfig.enabled) {
          if (!formData.followUpConfig.type) {
            errors.push('Debe seleccionar el tipo de seguimiento');
          }
          
          if (formData.followUpConfig.type.includes('before') && !formData.followUpConfig.days) {
            errors.push('Debe especificar cuántos días antes del evento');
          }
          
          if (formData.followUpConfig.type.includes('after') && !formData.followUpConfig.interval) {
            errors.push('Debe especificar el intervalo de seguimiento');
          }
          
          // Validar que las fechas base existen según el tipo
          if (formData.followUpConfig.type.includes('start') && !formData.startDate) {
            errors.push('Necesita una fecha de inicio para este tipo de seguimiento');
          }
          
          if (formData.followUpConfig.type.includes('end') && !formData.endDate) {
            errors.push('Necesita una fecha de fin para este tipo de seguimiento');
          }
        }
        break;
        
      case 3:
        for (const field of requiredFields) {
          const value = formData.dynamicPayload[field];
          if (!value || String(value).trim() === '') {
            errors.push(`Campo requerido: ${field}`);
          }
        }
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const validateAllSteps = useMemo(() => (formData: ActivityFormData, requiredFields: string[]): ValidationResult => {
    const allErrors: string[] = [];
    
    for (let step = 1; step <= 3; step++) {
      const result = validateStep(step, formData, requiredFields);
      allErrors.push(...result.errors);
    }
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }, [validateStep]);

  return {
    validateStep,
    validateAllSteps,
  };
};
