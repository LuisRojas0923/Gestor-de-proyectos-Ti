import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Title, Text } from '../atoms';
import Modal from './Modal';

interface DevelopmentData {
  id: string;
  name: string;
  description?: string;
  module?: string;
  type?: string;
  environment?: string;
  portal_link?: string;
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
  onClose: () => void;
  onSave: (updatedData: Partial<DevelopmentData>) => Promise<boolean>;
}

const DevelopmentEditModal: React.FC<DevelopmentEditModalProps> = ({
  isOpen,
  development,
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
        portal_link: development.portal_link || '',
        general_status: development.general_status || undefined,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Desarrollo"
      size="xl"
      showCloseButton={true}
    >
      <div className="max-h-[70vh] flex flex-col">
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Errores */}
            {errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <Text key={index} variant="caption" color="error" className="block">• {error}</Text>
                  ))}
                </div>
              </div>
            )}

            {/* Información básica */}
            <div className="space-y-4">
              <Title variant="h4" weight="medium">
                Información Básica
              </Title>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Nombre *"
                    value={formData.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>

                <div>
                  <Select
                    label="Estado General"
                    value={formData.general_status || ''}
                    onChange={(e) => handleFieldChange('general_status', e.target.value)}
                    options={statusOptions}
                  />
                </div>
              </div>

              <div>
                <Input
                  label="Descripción"
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Información técnica */}
            <div className="space-y-4">
              <Title variant="h4" weight="medium">
                Información Técnica
              </Title>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Módulo"
                    value={formData.module || ''}
                    onChange={(e) => handleFieldChange('module', e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div>
                  <Input
                    label="Tipo"
                    value={formData.type || ''}
                    onChange={(e) => handleFieldChange('type', e.target.value)}
                    maxLength={50}
                  />
                </div>

                <div>
                  <Input
                    label="Ambiente"
                    value={formData.environment || ''}
                    onChange={(e) => handleFieldChange('environment', e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div>
                  <Input
                    label="Link del Portal"
                    value={formData.portal_link || ''}
                    onChange={(e) => handleFieldChange('portal_link', e.target.value)}
                    type="url"
                  />
                </div>
              </div>
            </div>

            {/* Información de gestión */}
            <div className="space-y-4">
              <Title variant="h4" weight="medium">
                Información de Gestión
              </Title>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Proveedor"
                    value={formData.provider || ''}
                    onChange={(e) => handleFieldChange('provider', e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div>
                  <Input
                    label="Responsable"
                    value={formData.responsible || ''}
                    onChange={(e) => handleFieldChange('responsible', e.target.value)}
                    maxLength={255}
                  />
                </div>
              </div>

              <div>
                <Input
                  label="Fecha Estimada de Fin"
                  value={formData.estimated_end_date || ''}
                  onChange={(e) => handleFieldChange('estimated_end_date', e.target.value)}
                  type="date"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Actions */}
        <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-700 p-6">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DevelopmentEditModal;
