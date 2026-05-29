import React from 'react';
import { Input, Textarea, Title, Text } from '../../../atoms';

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
}

export const WizardStep3: React.FC<WizardStep3Props> = ({
  notes,
  dynamicPayload,
  fieldConfig,
  requiredFields,
  onNotesChange,
  onDynamicFieldChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Textarea
          label="Notas"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
          placeholder="Describe la actividad, observaciones o cualquier detalle relevante..."
        />
      </div>

      {/* Campos dinámicos específicos de la etapa */}
      {fieldConfig && requiredFields.length > 0 && (
        <div>
          <Title variant="h6" weight="semibold" className="mb-3">
            Campos específicos de la etapa "{fieldConfig.stage_name}"
          </Title>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {requiredFields.map((field) => (
              <div key={`req-${field}`}>
                <Input
                  label={`${field} *`}
                  value={dynamicPayload[field] || ''}
                  onChange={(e) => onDynamicFieldChange(field, e.target.value)}
                  placeholder={`Ingresa ${field.toLowerCase()}...`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {fieldConfig && requiredFields.length === 0 && (
        <div className="p-3 rounded-md bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <Text variant="body2" color="success">
            ✅ Esta etapa no requiere campos adicionales específicos.
          </Text>
        </div>
      )}
    </div>
  );
};
