import {
    AlertTriangle,
    Save,
    X
} from 'lucide-react';
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { ActivityCreate } from '../../types';

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
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Crear Nueva Actividad
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-neutral-700"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Título */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Título de la Actividad *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full p-3 rounded-lg border ${
              darkMode 
                ? 'bg-neutral-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-neutral-900'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            placeholder="Ej: Reunión de seguimiento semanal"
            required
          />
        </div>

        {/* Tipo de Actividad */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Tipo de Actividad
          </label>
          <select
            value={formData.activity_type}
            onChange={(e) => handleInputChange('activity_type', e.target.value)}
            className={`w-full p-3 rounded-lg border ${
              darkMode 
                ? 'bg-neutral-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-neutral-900'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            {activityTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Descripción
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className={`w-full p-3 rounded-lg border ${
              darkMode 
                ? 'bg-neutral-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-neutral-900'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            placeholder="Descripción detallada de la actividad..."
          />
        </div>

        {/* Fecha de Vencimiento */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Fecha de Vencimiento *
          </label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => handleInputChange('due_date', e.target.value)}
            className={`w-full p-3 rounded-lg border ${
              darkMode 
                ? 'bg-neutral-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-neutral-900'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>

        {/* Responsable */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Responsable
            </label>
            <select
              value={formData.responsible_party}
              onChange={(e) => handleInputChange('responsible_party', e.target.value)}
              className={`w-full p-3 rounded-lg border ${
                darkMode 
                  ? 'bg-neutral-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-neutral-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              {responsibleParties.map(party => (
                <option key={party.value} value={party.value}>
                  {party.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Persona Responsable
            </label>
            <input
              type="text"
              value={formData.responsible_person}
              onChange={(e) => handleInputChange('responsible_person', e.target.value)}
              className={`w-full p-3 rounded-lg border ${
                darkMode 
                  ? 'bg-neutral-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-neutral-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="Nombre de la persona responsable"
            />
          </div>
        </div>

        {/* Prioridad */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Prioridad
          </label>
          <select
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value)}
            className={`w-full p-3 rounded-lg border ${
              darkMode 
                ? 'bg-neutral-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-neutral-900'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            {priorities.map(priority => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={16} />
            <span>{isSubmitting ? 'Creando...' : 'Crear Actividad'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ActivityForm;
