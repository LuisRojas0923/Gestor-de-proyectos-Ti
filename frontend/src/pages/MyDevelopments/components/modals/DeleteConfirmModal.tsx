import React from 'react';
import { Trash2 } from 'lucide-react';
import { DevelopmentWithCurrentStatus } from '../../../../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  development: DevelopmentWithCurrentStatus | null;
  darkMode: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  development,
  darkMode,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !development) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className={`rounded-lg shadow-xl w-full max-w-md ${darkMode ? 'bg-neutral-800' : 'bg-white'}`}>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <div className="text-center">
            <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              ¿Eliminar Desarrollo?
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
              ¿Estás seguro de que deseas eliminar el desarrollo <strong>"{development.name}"</strong> ({development.id})?
            </p>
            <p className={`text-xs mb-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
              ⚠️ Esta acción no se puede deshacer. El desarrollo será eliminado permanentemente.
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-neutral-600 hover:bg-neutral-500 text-white' 
                  : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-900'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
