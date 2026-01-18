import React, { useState } from 'react';
import { AlertTriangle, Save, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { ActivityCreate } from '../../types';
import { Button, Input, Select, Textarea, Title, Text, Icon } from '../atoms';

interface ActivityFormProps {
  developmentId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ActivityForm: React.FC<ActivityFormProps> = ({
  developmentId,
  onSuccess,
  onCancel
}) => {
  const { state } = useAppContext();
  const { darkMode } = state;
  const { post } = useApi();

  const [formData, setFormData] = useState<ActivityCreate>({
    development_id: developmentId,
    activity_type: 'reunion',
    title: '',
    description: '',
    due_date: '',
    responsible_party: 'equipo_interno',
    responsible_person: '',
    priority: 'Media',
    created_by: 'Usuario Actual'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.due_date) {
      setError('El título y la fecha son obligatorios');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await post('/alerts/activities', formData);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error creating activity:', err);
      setError('Error al crear la actividad');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ActivityCreate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const activityTypes = [
    { value: 'reunion', label: 'Reunión' },
    { value: 'entrega_proveedor', label: 'Entrega Proveedor' },
    { value: 'entrega_usuario', label: 'Entrega Usuario' },
    { value: 'revision', label: 'Revisión' },
    { value: 'aprobacion', label: 'Aprobación' },
    { value: 'despliegue', label: 'Despliegue' },
    { value: 'pruebas', label: 'Pruebas' },
    { value: 'documentacion', label: 'Documentación' }
  ];

  const responsibleParties = [
    { value: 'proveedor', label: 'Proveedor' },
    { value: 'usuario', label: 'Usuario' },
    { value: 'equipo_interno', label: 'Equipo Interno' }
  ];

  const priorities = [
    { value: 'Baja', label: 'Baja' },
    { value: 'Media', label: 'Media' },
    { value: 'Alta', label: 'Alta' },
    { value: 'Crítica', label: 'Crítica' }
  ];

  return (
    <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-6">
        <Title variant="h5" weight="bold">
          Crear Nueva Actividad
        </Title>
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            icon={X}
            onClick={onCancel}
          />
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center space-x-2">
          <Icon name={AlertTriangle} size="sm" color="error" />
          <Text variant="body2" color="error">{error}</Text>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Título */}
        <Input
          label="Título de la Actividad *"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Ej: Reunión de seguimiento semanal"
          required
        />

        {/* Tipo de Actividad */}
        <Select
          label="Tipo de Actividad"
          value={formData.activity_type}
          onChange={(e) => handleInputChange('activity_type', e.target.value)}
          options={activityTypes}
        />

        {/* Descripción */}
        <Textarea
          label="Descripción"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
          placeholder="Descripción detallada de la actividad..."
        />

        {/* Fecha de Vencimiento */}
        <Input
          label="Fecha de Vencimiento *"
          type="date"
          value={formData.due_date}
          onChange={(e) => handleInputChange('due_date', e.target.value)}
          required
        />

        {/* Responsable */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Responsable"
            value={formData.responsible_party}
            onChange={(e) => handleInputChange('responsible_party', e.target.value)}
            options={responsibleParties}
          />

          <Input
            label="Persona Responsable"
            value={formData.responsible_person}
            onChange={(e) => handleInputChange('responsible_person', e.target.value)}
            placeholder="Nombre de la persona responsable"
          />
        </div>

        {/* Prioridad */}
        <Select
          label="Prioridad"
          value={formData.priority}
          onChange={(e) => handleInputChange('priority', e.target.value)}
          options={priorities}
        />

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            loading={isSubmitting}
            icon={Save}
          >
            Crear Actividad
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ActivityForm;
