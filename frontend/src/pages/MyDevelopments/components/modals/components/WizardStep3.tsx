import React from 'react';

interface StageFieldConfigResponse {
  stage_id: number;
  stage_name: string;
  stage_code: string;
  has_dynamic_fields: boolean;
  required_fields: string[];
  optional_fields: string[];
}

interface WizardStep3Props {
  notes: string;
  dynamicPayload: Record<string, string>;
  fieldConfig: StageFieldConfigResponse | null;
  requiredFields: string[];
  onNotesChange: (notes: string) => void;
  onDynamicFieldChange: (key: string, value: string) => void;
  darkMode: boolean;
}

export const WizardStep3: React.FC<WizardStep3Props> = ({
  notes,
  dynamicPayload,
  fieldConfig,
  requiredFields,
  onNotesChange,
  onDynamicFieldChange,
  darkMode,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
          Notas
        </label>
        <textarea 
          value={notes} 
          onChange={(e) => onNotesChange(e.target.value)} 
          rows={4} 
          placeholder="Describe la actividad, observaciones o cualquier detalle relevante..."
          className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`} 
        />
      </div>

      {/* Campos dinámicos específicos de la etapa */}
      {fieldConfig && requiredFields.length > 0 && (
        <div>
          <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Campos específicos de la etapa "{fieldConfig.stage_name}"
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {requiredFields.map((field) => (
              <div key={`req-${field}`}>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  {field} *
                </label>
                <input 
                  value={dynamicPayload[field] || ''} 
                  onChange={(e) => onDynamicFieldChange(field, e.target.value)} 
                  placeholder={`Ingresa ${field.toLowerCase()}...`}
                  className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`} 
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {fieldConfig && requiredFields.length === 0 && (
        <div className={`p-3 rounded-md ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
          <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
            ✅ Esta etapa no requiere campos adicionales específicos.
          </p>
        </div>
      )}
    </div>
  );
};
