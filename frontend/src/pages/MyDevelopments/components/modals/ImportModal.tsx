import React from 'react';
import { X } from 'lucide-react';
import ExcelImporter from '../../../../components/common/ExcelImporter';
import { DevelopmentWithCurrentStatus } from '../../../../types';

interface ImportModalProps {
  isOpen: boolean;
  darkMode: boolean;
  onClose: () => void;
  onImport: (importedData: Partial<DevelopmentWithCurrentStatus>[]) => Promise<void>;
  isImporting?: boolean;
}

// Column mapping for the importer - Updated to match your Excel structure
const columnMapping = {
  'ID de la incidencia*+': 'id', // El texto será el ID, el hipervínculo será portal_link
  'Usuario asignado+': 'responsible', // Campo Responsable de la aplicación
  'Apellidos+': 'responsible_lastname', // Apellidos del responsable
  'Nombre+': 'responsible_firstname', // Nombre del responsable
  'Resumen*': 'name', // Nombre del desarrollo
  'Estado*': 'general_status', // Mapear Estado* del Excel al general_status
  'Fecha de envío': 'start_date',
  // portal_link se extraerá automáticamente del hipervínculo de 'ID de la incidencia*+'
  // Todas las demás columnas se ignoran automáticamente
};

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  darkMode,
  onClose,
  onImport,
  isImporting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className={`relative rounded-lg shadow-xl w-full max-w-4xl ${darkMode ? 'bg-neutral-900' : 'bg-white'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Importar Desarrollos desde Excel
            </h3>
            <button
              onClick={onClose}
              disabled={isImporting}
              className={`p-1 rounded-full transition-colors ${darkMode ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <X size={20} />
            </button>
          </div>
          <ExcelImporter<Partial<DevelopmentWithCurrentStatus>>
            onImport={onImport}
            columnMapping={columnMapping}
            identifierKey="id"
            darkMode={darkMode}
          />
        </div>
        {isImporting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/30">
            <div className="animate-spin h-6 w-6 rounded-full border-2 border-t-transparent border-white"></div>
            <p className="mt-3 text-white text-sm">Importando datos…</p>
          </div>
        )}
      </div>
    </div>
  );
};
