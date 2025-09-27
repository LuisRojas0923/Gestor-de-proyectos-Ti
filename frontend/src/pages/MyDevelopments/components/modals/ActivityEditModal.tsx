import React from 'react';
import { MaterialCard, MaterialButton } from '../../../../components/atoms';

interface ActivityEditModalProps {
  isOpen: boolean;
  activity: any | null;
  form: { 
    status: string; 
    notes?: string; 
    next_follow_up_at?: string; 
    start_date?: string; 
    end_date?: string;
  } | null;
  errors: string[];
  darkMode: boolean;
  onFormChange: (patch: Partial<{ 
    status: string; 
    notes?: string; 
    next_follow_up_at?: string; 
    start_date?: string; 
    end_date?: string;
  }>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ActivityEditModal: React.FC<ActivityEditModalProps> = ({
  isOpen,
  activity,
  form,
  errors,
  darkMode,
  onFormChange,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !activity || !form) return null;

  return (
    <div className={`${darkMode ? 'bg-black/60' : 'bg-black/40'} fixed inset-0 z-50 flex items-center justify-center`}>
      <MaterialCard elevation={8} className="w-full max-w-md" darkMode={darkMode}>
        <MaterialCard.Header>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Editar Actividad
          </h3>
        </MaterialCard.Header>
        <MaterialCard.Content>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Estado
              </label>
              <select
                value={form.status}
                onChange={(e) => onFormChange({ status: e.target.value })}
                className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_curso">En Curso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={form.start_date || ''}
                  onChange={(e) => onFormChange({ start_date: e.target.value })}
                  className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  Fecha de fin
                </label>
                <input
                  type="date"
                  value={form.end_date || ''}
                  onChange={(e) => onFormChange({ end_date: e.target.value })}
                  className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                />
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Notas
              </label>
              <textarea
                value={form.notes || ''}
                onChange={(e) => onFormChange({ notes: e.target.value })}
                rows={3}
                className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Próximo seguimiento
              </label>
              <input
                type="date"
                value={form.next_follow_up_at || ''}
                onChange={(e) => onFormChange({ next_follow_up_at: e.target.value })}
                className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
              />
            </div>
            
            {errors.length > 0 && (
              <div className={`p-3 rounded-md ${darkMode ? 'bg-red-900/20 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                <ul className="list-disc pl-5 text-sm">
                  {errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </MaterialCard.Content>
        <MaterialCard.Actions>
          <MaterialButton variant="outlined" color="inherit" onClick={onCancel}>
            Cancelar
          </MaterialButton>
          <MaterialButton 
            variant="contained" 
            onClick={onConfirm} 
            className={`${darkMode ? '!bg-blue-600 hover:!bg-blue-700 text-white' : '!bg-blue-600 hover:!bg-blue-700 text-white'}`}
          >
            Guardar
          </MaterialButton>
        </MaterialCard.Actions>
      </MaterialCard>
    </div>
  );
};
