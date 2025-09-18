// Tipos TypeScript para controles de calidad
// Basados en los esquemas reales del backend

export interface QualityControlCatalog {
  id: number;
  control_code: string;
  control_name: string;
  description: string;
  stage_prefix: string;
  stage_description?: string;
  deliverables?: string;  // Lista de entregables separados por comas
  validation_criteria?: string;
  responsible_party: string;  // 'analista', 'arquitecto', 'equipo_interno'
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DevelopmentQualityControl {
  id: number;
  development_id: string;
  control_catalog_id: number;
  control_code: string;
  status: 'Pendiente' | 'Completado' | 'No Aplica' | 'Rechazado';
  validation_status: 'Pendiente' | 'Validado' | 'Rechazado' | 'En Revisión';
  completed_by?: string;
  completed_at?: string;
  validated_by?: string;
  validated_at?: string;
  deliverables_provided?: string;  // JSON string con entregables completados
  deliverables_completed?: string;  // JSON array de entregables marcados como completados
  validation_notes?: string;
  rejection_reason?: string;
  evidence_files?: string; // JSON string
  created_at: string;
  updated_at?: string;
}

export interface QualityControlWithCatalog extends DevelopmentQualityControl {
  catalog: QualityControlCatalog;
}

export interface QualityControlCreate {
  development_id: string;
  control_catalog_id: number;
  control_code: string;
  status?: 'Pendiente' | 'Completado' | 'No Aplica' | 'Rechazado';
  deliverables_provided?: string;
  validation_notes?: string;
}

export interface QualityControlUpdate {
  status?: 'Pendiente' | 'Completado' | 'No Aplica' | 'Rechazado';
  validation_status?: 'Pendiente' | 'Validado' | 'Rechazado' | 'En Revisión';
  completed_by?: string;
  validated_by?: string;
  deliverables_provided?: string;
  validation_notes?: string;
  rejection_reason?: string;
  evidence_files?: string;
}

export interface QualityControlValidation {
  validation_status: 'Validado' | 'Rechazado' | 'En Revisión';
  validated_by: string;
  validation_notes?: string;
  rejection_reason?: string;
}

export interface QualityControlFilters {
  development_id?: string;
  control_code?: string;
  status?: string;
  validation_status?: string;
  stage_prefix?: string;
  is_active?: boolean;
}

export interface QualityControlListResponse {
  controls: QualityControlWithCatalog[];
  total: number;
  skip: number;
  limit: number;
}

// Tipos para evidencia y archivos
export interface QualityControlEvidence {
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
}

export interface QualityControlEvidenceUpload {
  control_id: number;
  files: File[];
  description?: string;
}
