import React, { useState } from 'react';
import { ShieldCheck, CheckCircle, XCircle, Clock, AlertCircle, Plus, FileText } from 'lucide-react';
import { useQualityControls } from '../../hooks/useQualityControls';
import { DevelopmentQualityControl, QualityControlCatalog } from '../../types';

interface QualityControlsTabProps {
  developmentId: string;
  developmentName: string;
  currentStageName: string;
  darkMode: boolean;
}

const QualityControlsTab: React.FC<QualityControlsTabProps> = ({
  developmentId,
  developmentName,
  currentStageName,
  darkMode
}) => {
  const {
    controls,
    catalog,
    loading,
    error,
    completeControl,
    validateControl,
    generateControls,
    refreshControls
  } = useQualityControls(developmentId);

  const [selectedControl, setSelectedControl] = useState<DevelopmentQualityControl | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [completionData, setCompletionData] = useState({
    deliverables: '',
    completed_by: 'Usuario Actual' // TODO: Obtener del contexto de auth
  });
  const [validationData, setValidationData] = useState({
    validation_status: 'Validado' as 'Validado' | 'Rechazado' | 'En Revisión',
    validation_notes: '',
    validated_by: 'Usuario Actual' // TODO: Obtener del contexto de auth
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completado':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Validado':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'Rechazado':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'En Revisión':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completado':
      case 'Validado':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Rechazado':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'En Revisión':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const handleCompleteControl = async () => {
    if (selectedControl) {
      const success = await completeControl(selectedControl.id, completionData);
      if (success) {
        setShowCompleteModal(false);
        setSelectedControl(null);
        setCompletionData({ deliverables: '', completed_by: 'Usuario Actual' });
      }
    }
  };

  const handleValidateControl = async () => {
    if (selectedControl) {
      const success = await validateControl(selectedControl.id, validationData);
      if (success) {
        setShowValidateModal(false);
        setSelectedControl(null);
        setValidationData({
          validation_status: 'Validado',
          validation_notes: '',
          validated_by: 'Usuario Actual'
        });
      }
    }
  };

  const handleGenerateControls = async () => {
    const success = await generateControls(developmentId);
    if (success) {
      // Los controles se recargan automáticamente
    }
  };

  if (loading && controls.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className={`ml-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Cargando controles...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center">
          <XCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700 dark:text-red-300">Error: {error}</span>
        </div>
        <button
          onClick={refreshControls}
          className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded text-sm hover:bg-red-200 dark:hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className={`text-lg font-semibold flex items-center ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            <ShieldCheck size={18} className="mr-2"/>
            Controles de Calidad
          </h4>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Etapa actual: <span className="font-medium">{currentStageName}</span>
          </p>
        </div>
        
        {controls.length === 0 && (
          <button
            onClick={handleGenerateControls}
            disabled={loading}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Generar Controles
          </button>
        )}
      </div>

      {controls.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed rounded-lg border-neutral-300 dark:border-neutral-700">
          <ShieldCheck size={48} className="mx-auto text-gray-400 mb-4" />
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            No hay controles de calidad asignados para esta etapa.
          </p>
          <button
            onClick={handleGenerateControls}
            disabled={loading}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {loading ? 'Generando...' : 'Generar Controles Automáticamente'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {controls.map((control) => (
            <div key={control.id} className={`p-4 rounded-lg border ${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-white border-neutral-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {getStatusIcon(control.status)}
                    <h5 className={`font-semibold ml-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                      {control.control_code}
                    </h5>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(control.status)}`}>
                      {control.status}
                    </span>
                    {control.validation_status !== 'Pendiente' && (
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(control.validation_status)}`}>
                        {control.validation_status}
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-sm mb-3 ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {control.deliverables_provided || 'Descripción del control no disponible'}
                  </p>
                  
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>Creado: {new Date(control.created_at).toLocaleDateString()}</span>
                    {control.completed_at && (
                      <span className="ml-4">Completado: {new Date(control.completed_at).toLocaleDateString()}</span>
                    )}
                    {control.validated_at && (
                      <span className="ml-4">Validado: {new Date(control.validated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  {control.status === 'Pendiente' && (
                    <button
                      onClick={() => {
                        setSelectedControl(control);
                        setShowCompleteModal(true);
                      }}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Completar
                    </button>
                  )}
                  
                  {control.status === 'Completado' && control.validation_status === 'Pendiente' && (
                    <button
                      onClick={() => {
                        setSelectedControl(control);
                        setShowValidateModal(true);
                      }}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      Validar
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setSelectedControl(control);
                      // TODO: Implementar modal de detalles
                    }}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    <FileText size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para completar control */}
      {showCompleteModal && selectedControl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg max-w-md w-full mx-4 ${darkMode ? 'bg-neutral-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Completar Control {selectedControl.control_code}
            </h3>
            
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                Entregables
              </label>
              <textarea
                value={completionData.deliverables}
                onChange={(e) => setCompletionData({...completionData, deliverables: e.target.value})}
                className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300'}`}
                rows={4}
                placeholder="Describe los entregables completados..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCompleteControl}
                disabled={!completionData.deliverables.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Completar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para validar control */}
      {showValidateModal && selectedControl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg max-w-md w-full mx-4 ${darkMode ? 'bg-neutral-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Validar Control {selectedControl.control_code}
            </h3>
            
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                Estado de Validación
              </label>
              <select
                value={validationData.validation_status}
                onChange={(e) => setValidationData({...validationData, validation_status: e.target.value as any})}
                className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300'}`}
              >
                <option value="Validado">Validado</option>
                <option value="Rechazado">Rechazado</option>
                <option value="En Revisión">En Revisión</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                Notas de Validación
              </label>
              <textarea
                value={validationData.validation_notes}
                onChange={(e) => setValidationData({...validationData, validation_notes: e.target.value})}
                className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300'}`}
                rows={3}
                placeholder="Agrega notas sobre la validación..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowValidateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleValidateControl}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Validar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityControlsTab;
