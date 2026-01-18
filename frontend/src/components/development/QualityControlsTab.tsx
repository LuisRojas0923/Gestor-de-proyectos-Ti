import React, { useState } from 'react';
import { ShieldCheck, CheckCircle, XCircle, Clock, AlertCircle, Plus, FileText } from 'lucide-react';
import { useQualityControls } from '../../hooks/useQualityControls';
import { QualityControlWithCatalog } from '../../types';
import { Button, Select, Textarea, Checkbox } from '../atoms';

interface QualityControlsTabProps {
  developmentId: string;
  currentStageName: string;
  darkMode: boolean;
}

const QualityControlsTab: React.FC<QualityControlsTabProps> = ({
  developmentId,
  currentStageName,
  darkMode
}) => {
  const {
    controls,
    loading,
    error,
    completeControl,
    validateControl,
    generateControls,
    refreshControls
  } = useQualityControls(developmentId);

  const [selectedControl, setSelectedControl] = useState<QualityControlWithCatalog | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [completionData, setCompletionData] = useState({
    deliverables: '',
    deliverables_completed: [] as string[],
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
        setCompletionData({ deliverables: '', deliverables_completed: [], completed_by: 'Usuario Actual' });
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
        <Button
          variant="danger"
          size="sm"
          onClick={refreshControls}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className={`text-lg font-semibold flex items-center ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            <ShieldCheck size={18} className="mr-2" />
            Controles de Calidad
          </h4>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Etapa actual: <span className="font-medium">{currentStageName}</span>
          </p>
        </div>

        {controls.length === 0 && (
          <Button
            onClick={handleGenerateControls}
            loading={loading}
            icon={Plus}
          >
            Generar Controles
          </Button>
        )}
      </div>

      {controls.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed rounded-lg border-neutral-300 dark:border-neutral-700">
          <ShieldCheck size={48} className="mx-auto text-gray-400 mb-4" />
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            No hay controles de calidad asignados para esta etapa.
          </p>
          <Button
            onClick={handleGenerateControls}
            loading={loading}
          >
            {loading ? 'Generando...' : 'Generar Controles Automáticamente'}
          </Button>
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

                  <p className={`text-sm mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {control.catalog?.description || 'Descripción del control no disponible'}
                  </p>

                  {control.catalog?.responsible_party && (
                    <p className={`text-xs mb-3 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      <span className="font-medium">Responsable:</span> {
                        control.catalog.responsible_party === 'analista' ? 'Analista' :
                          control.catalog.responsible_party === 'arquitecto' ? 'Arquitecto' :
                            control.catalog.responsible_party === 'equipo_interno' ? 'Equipo Interno' :
                              control.catalog.responsible_party
                      }
                    </p>
                  )}

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
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedControl(control);
                        setShowCompleteModal(true);
                      }}
                    >
                      Completar
                    </Button>
                  )}

                  {control.status === 'Completado' && control.validation_status === 'Pendiente' && (
                    <Button
                      variant="primary" // En el original era bg-green-500, pero primary suele ser azul. Usaré primary o crearé variant success si existiera.
                      size="sm"         // Button.tsx no tiene variant success, pero tiene primary. 
                      className="bg-green-600 hover:bg-green-700" // Sobrescribo para mantener el verde de validación
                      onClick={() => {
                        setSelectedControl(control);
                        setShowValidateModal(true);
                      }}
                    >
                      Validar
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={FileText}
                    onClick={() => {
                      setSelectedControl(control);
                      // TODO: Implementar modal de detalles
                    }}
                  />
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

            {/* Entregables como checkboxes */}
            {selectedControl.catalog?.deliverables && (
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  Entregables Requeridos
                </label>
                <div className="space-y-3">
                  {selectedControl.catalog.deliverables.split(',').map((deliverable, index) => {
                    const trimmedDeliverable = deliverable.trim();
                    return (
                      <Checkbox
                        key={index}
                        label={trimmedDeliverable}
                        checked={completionData.deliverables_completed.includes(trimmedDeliverable)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCompletionData({
                              ...completionData,
                              deliverables_completed: [...completionData.deliverables_completed, trimmedDeliverable]
                            });
                          } else {
                            setCompletionData({
                              ...completionData,
                              deliverables_completed: completionData.deliverables_completed.filter(d => d !== trimmedDeliverable)
                            });
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <Textarea
              label="Notas Adicionales"
              value={completionData.deliverables}
              onChange={(e) => setCompletionData({ ...completionData, deliverables: e.target.value })}
              rows={3}
              placeholder="Agrega notas adicionales sobre la completación..."
            />

            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="ghost"
                onClick={() => setShowCompleteModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCompleteControl}
                disabled={completionData.deliverables_completed.length === 0}
              >
                Completar
              </Button>
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

            <Select
              label="Estado de Validación"
              value={validationData.validation_status}
              onChange={(e) => setValidationData({ ...validationData, validation_status: e.target.value as 'Validado' | 'Rechazado' | 'En Revisión' })}
              options={[
                { value: 'Validado', label: 'Validado' },
                { value: 'Rechazado', label: 'Rechazado' },
                { value: 'En Revisión', label: 'En Revisión' }
              ]}
            />

            <Textarea
              label="Notas de Validación"
              value={validationData.validation_notes}
              onChange={(e) => setValidationData({ ...validationData, validation_notes: e.target.value })}
              rows={3}
              placeholder="Agrega notas sobre la validación..."
            />

            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="ghost"
                onClick={() => setShowValidateModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleValidateControl}
              >
                Validar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityControlsTab;
