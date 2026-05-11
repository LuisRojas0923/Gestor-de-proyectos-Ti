import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Title, Text, Textarea } from '../atoms';
import Modal from './Modal';

interface DevelopmentData {
  id: string;
  name: string;
  nombre?: string;
  description?: string;
  descripcion?: string;
  module?: string;
  modulo?: string;
  type?: string;
  tipo?: string;
  environment?: string;
  ambiente?: string;
  portal_link?: string;
  enlace_portal?: string;
  current_phase_id?: number;
  current_stage_id?: number;
  stage_progress_percentage?: number;
  general_status?: 'Pendiente' | 'En curso' | 'Completado' | 'Cancelado';
  estado_general?: string;
  start_date?: string;
  fecha_inicio?: string;
  estimated_end_date?: string;
  fecha_estimada_fin?: string;
  provider?: string;
  proveedor?: string;
  authority?: string;
  autoridad?: string;
  responsible?: string;
  responsable?: string;
  area_desarrollo?: string;
  analista?: string;
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
        name: development.name || development.nombre || '',
        description: development.description || development.descripcion || '',
        module: development.module || development.modulo || '',
        type: development.type || development.tipo || '',
        environment: development.environment || development.ambiente || '',
        portal_link: development.portal_link || development.enlace_portal || '',
        general_status: development.general_status || development.estado_general || undefined,
        start_date: development.start_date || development.fecha_inicio || '',
        estimated_end_date: development.estimated_end_date || development.fecha_estimada_fin || '',
        authority: development.authority || development.autoridad || '',
        responsible: development.responsible || development.responsable || '',
        area_desarrollo: development.area_desarrollo || '',
        analista: development.analista || '',
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

    if (formData.responsible && formData.responsible.length > 255) {
      newErrors.push('El responsable no puede exceder 255 caracteres');
    }

    if (formData.authority && formData.authority.length > 255) {
      newErrors.push('La autoridad no puede exceder 255 caracteres');
    }

    // Validar fecha estimada
    if (formData.start_date) {
      const date = new Date(formData.start_date);
      if (isNaN(date.getTime())) {
        newErrors.push('La fecha de inicio no es válida');
      }
    }

    if (formData.estimated_end_date) {
      const date = new Date(formData.estimated_end_date);
      if (isNaN(date.getTime())) {
        newErrors.push('La fecha estimada no es válida');
      }
    }

    if (formData.start_date && formData.estimated_end_date && new Date(formData.start_date) > new Date(formData.estimated_end_date)) {
      newErrors.push('La fecha de inicio no puede ser mayor que la fecha estimada de fin');
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
    { value: 'pendiente', label: 'Pendiente (seed)' },
    { value: 'En curso', label: 'En curso' },
    { value: 'en_progreso', label: 'En progreso (seed)' },
    { value: 'Completado', label: 'Completado' },
    { value: 'completada', label: 'Completada (seed)' },
    { value: 'Cancelado', label: 'Cancelado' },
  ];

  if (!isOpen || !development) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Proyecto"
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
                    label="Nombre del Proyecto *"
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
                <Textarea
                  label="Descripción"
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
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
                    label="Proceso"
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
                    label="Responsable"
                    value={formData.responsible || ''}
                    onChange={(e) => handleFieldChange('responsible', e.target.value)}
                    maxLength={255}
                  />
                </div>

                <div>
                  <Input
                    label="Autoridad"
                    value={formData.authority || ''}
                    onChange={(e) => handleFieldChange('authority', e.target.value)}
                    maxLength={255}
                  />
                </div>

                <div>
                  <Input
                    label="Área de impacto"
                    value={formData.area_desarrollo || ''}
                    onChange={(e) => handleFieldChange('area_desarrollo', e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div>
                  <Input
                    label="Líder de actividad"
                    value={formData.analista || ''}
                    onChange={(e) => handleFieldChange('analista', e.target.value)}
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Fecha de Inicio"
                    value={formData.start_date || ''}
                    onChange={(e) => handleFieldChange('start_date', e.target.value)}
                    type="date"
                  />
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
