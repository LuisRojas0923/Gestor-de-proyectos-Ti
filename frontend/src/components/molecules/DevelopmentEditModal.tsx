import React, { useState, useEffect } from 'react';
import { MaterialCard, MaterialButton, MaterialTextField } from '../atoms';
import { MaterialSelect } from '../atoms';

interface DevelopmentData {
  id: string;
  name: string;
  description?: string;
  module?: string;
  type?: string;
  environment?: string;
  remedy_link?: string;
  current_phase_id?: number;
  current_stage_id?: number;
  stage_progress_percentage?: number;
  general_status?: 'Pendiente' | 'En curso' | 'Completado' | 'Cancelado';
  estimated_end_date?: string;
  provider?: string;
  responsible?: string;
}

interface DevelopmentEditModalProps {
  isOpen: boolean;
  development: DevelopmentData | null;
  darkMode: boolean;
  onClose: () => void;
  onSave: (updatedData: Partial<DevelopmentData>) => Promise<boolean>;
}

const DevelopmentEditModal: React.FC<DevelopmentEditModalProps> = ({
  isOpen,
  development,
  darkMode,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<DevelopmentData>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Inicializar datos del formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen && development) {
      setFormData({
        name: development.name || '',
        description: development.description || '',
        module: development.module || '',
        type: development.type || '',
        environment: development.environment || '',
        remedy_link: development.remedy_link || '',
        general_status: development.general_status || '',
        estimated_end_date: development.estimated_end_date || '',
        provider: development.provider || '',
        responsible: development.responsible || '',
      });
      setErrors([]);
    }
  }, [isOpen, development]);

  // Validación del formulario
  const validateForm = (): string[] => {
    const newErrors: string[] = [];

    if (!formData.name || formData.name.trim() === '') {
      newErrors.push('El nombre es requerido');
    }

    if (formData.name && formData.name.length > 255) {
      newErrors.push('El nombre no puede exceder 255 caracteres');
    }

    if (formData.module && formData.module.length > 100) {
      newErrors.push('El módulo no puede exceder 100 caracteres');
    }

    if (formData.type && formData.type.length > 50) {
      newErrors.push('El tipo no puede exceder 50 caracteres');
    }

    if (formData.environment && formData.environment.length > 100) {
      newErrors.push('El ambiente no puede exceder 100 caracteres');
    }

    if (formData.provider && formData.provider.length > 100) {
      newErrors.push('El proveedor no puede exceder 100 caracteres');
    }

    if (formData.responsible && formData.responsible.length > 255) {
      newErrors.push('El responsable no puede exceder 255 caracteres');
    }

    // Validar fecha estimada
    if (formData.estimated_end_date) {
      const date = new Date(formData.estimated_end_date);
      if (isNaN(date.getTime())) {
        newErrors.push('La fecha estimada no es válida');
      }
    }

    return newErrors;
  };

  // Manejar cambios en los campos
  const handleFieldChange = (field: keyof DevelopmentData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const success = await onSave(formData);
      if (success) {
        onClose();
      }
    } catch (error) {
      setErrors(['Error al guardar los cambios. Intenta nuevamente.']);
    } finally {
      setLoading(false);
    }
  };

  // Opciones para el estado general
  const statusOptions = [
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'En curso', label: 'En curso' },
    { value: 'Completado', label: 'Completado' },
    { value: 'Cancelado', label: 'Cancelado' },
  ];

  if (!isOpen || !development) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <MaterialCard 
        darkMode={darkMode}
        elevation={3}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <MaterialCard.Header darkMode={darkMode}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Editar Desarrollo
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-opacity-10 hover:bg-gray-500 ${darkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              ✕
            </button>
          </div>
        </MaterialCard.Header>

        {/* Content */}
        <MaterialCard.Content darkMode={darkMode} className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* Errores */}
            {errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Información básica */}
            <div className="space-y-4">
              <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                Información Básica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <MaterialTextField
                    label="Nombre *"
                    value={formData.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    darkMode={darkMode}
                    required
                    maxLength={255}
                  />
                </div>
                
                <div>
                  <MaterialSelect
                    label="Estado General"
                    value={formData.general_status || ''}
                    onChange={(e) => handleFieldChange('general_status', e.target.value)}
                    darkMode={darkMode}
                    options={statusOptions}
                  />
                </div>
              </div>

              <div>
                <MaterialTextField
                  label="Descripción"
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  darkMode={darkMode}
                  multiline
                  rows={3}
                />
              </div>
            </div>

            {/* Información técnica */}
            <div className="space-y-4">
              <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                Información Técnica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <MaterialTextField
                    label="Módulo"
                    value={formData.module || ''}
                    onChange={(e) => handleFieldChange('module', e.target.value)}
                    darkMode={darkMode}
                    maxLength={100}
                  />
                </div>
                
                <div>
                  <MaterialTextField
                    label="Tipo"
                    value={formData.type || ''}
                    onChange={(e) => handleFieldChange('type', e.target.value)}
                    darkMode={darkMode}
                    maxLength={50}
                  />
                </div>
                
                <div>
                  <MaterialTextField
                    label="Ambiente"
                    value={formData.environment || ''}
                    onChange={(e) => handleFieldChange('environment', e.target.value)}
                    darkMode={darkMode}
                    maxLength={100}
                  />
                </div>
                
                <div>
                  <MaterialTextField
                    label="Link de Remedy"
                    value={formData.remedy_link || ''}
                    onChange={(e) => handleFieldChange('remedy_link', e.target.value)}
                    darkMode={darkMode}
                    type="url"
                  />
                </div>
              </div>
            </div>

            {/* Información de gestión */}
            <div className="space-y-4">
              <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                Información de Gestión
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <MaterialTextField
                    label="Proveedor"
                    value={formData.provider || ''}
                    onChange={(e) => handleFieldChange('provider', e.target.value)}
                    darkMode={darkMode}
                    maxLength={100}
                  />
                </div>
                
                <div>
                  <MaterialTextField
                    label="Responsable"
                    value={formData.responsible || ''}
                    onChange={(e) => handleFieldChange('responsible', e.target.value)}
                    darkMode={darkMode}
                    maxLength={255}
                  />
                </div>
              </div>

              <div>
                <MaterialTextField
                  label="Fecha Estimada de Fin"
                  value={formData.estimated_end_date || ''}
                  onChange={(e) => handleFieldChange('estimated_end_date', e.target.value)}
                  darkMode={darkMode}
                  type="date"
                />
              </div>
            </div>
          </div>
        </MaterialCard.Content>

        {/* Actions */}
        <MaterialCard.Actions darkMode={darkMode} className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex gap-3 w-full">
            <MaterialButton
              variant="outlined"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </MaterialButton>
            <MaterialButton
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </MaterialButton>
          </div>
        </MaterialCard.Actions>
      </MaterialCard>
    </div>
  );
};

export default DevelopmentEditModal;
