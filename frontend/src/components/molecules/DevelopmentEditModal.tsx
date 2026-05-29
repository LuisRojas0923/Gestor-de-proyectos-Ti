import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Title, Text, Textarea } from '../atoms';
import Modal from './Modal';
import { Info, Cpu, Users, Calendar, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';

interface DevelopmentData {
  id: string;
  name: string;
  nombre?: string;
  description?: string;
  descripcion?: string;
  module?: string;
  modulo?: string;
  type?: string;
  tipo?: string;
  environment?: string;
  ambiente?: string;
  portal_link?: string;
  enlace_portal?: string;
  current_phase_id?: number;
  current_stage_id?: number;
  stage_progress_percentage?: number;
  general_status?: 'Pendiente' | 'En curso' | 'Completado' | 'Cancelado';
  estado_general?: string;
  start_date?: string;
  fecha_inicio?: string;
  estimated_end_date?: string;
  fecha_estimada_fin?: string;
  provider?: string;
  proveedor?: string;
  authority?: string;
  autoridad?: string;
  responsible?: string;
  responsable?: string;
  area_desarrollo?: string;
  analista?: string;
}

interface DevelopmentEditModalProps {
  isOpen: boolean;
  development: DevelopmentData | null;
  onClose: () => void;
  onSave: (updatedData: Partial<DevelopmentData>) => Promise<boolean>;
}

const DevelopmentEditModal: React.FC<DevelopmentEditModalProps> = ({
  isOpen,
  development,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<DevelopmentData>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState(1);

  // Inicializar datos del formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen && development) {
      setStep(1);
      setFormData({
        name: development.name || development.nombre || '',
        description: development.description || development.descripcion || '',
        module: development.module || development.modulo || '',
        type: development.type || development.tipo || '',
        environment: development.environment || development.ambiente || '',
        portal_link: development.portal_link || development.enlace_portal || '',
        general_status: development.general_status || development.estado_general || undefined,
        start_date: development.start_date || development.fecha_inicio || '',
        estimated_end_date: development.estimated_end_date || development.fecha_estimada_fin || '',
        authority: development.authority || development.autoridad || '',
        responsible: development.responsible || development.responsable || '',
        area_desarrollo: development.area_desarrollo || '',
        analista: development.analista || '',
      });
      setErrors([]);
    }
  }, [isOpen, development]);

  // Validación del formulario
  const validateStep = (currentStep: number): string[] => {
    const newErrors: string[] = [];

    if (currentStep === 1) {
      if (!formData.name || formData.name.trim() === '') {
        newErrors.push('El nombre del proyecto es requerido');
      }
      if (formData.name && formData.name.length > 255) {
        newErrors.push('El nombre no puede exceder 255 caracteres');
      }
    }

    if (currentStep === 2) {
      if (formData.module && formData.module.length > 100) {
        newErrors.push('El proceso/módulo no puede exceder 100 caracteres');
      }
      if (formData.type && formData.type.length > 50) {
        newErrors.push('El tipo no puede exceder 50 caracteres');
      }
    }

    if (currentStep === 3) {
      if (formData.start_date && formData.estimated_end_date && new Date(formData.start_date) > new Date(formData.estimated_end_date)) {
        newErrors.push('La fecha de inicio no puede ser mayor que la fecha estimada de fin');
      }
    }

    return newErrors;
  };

  // Manejar cambios en los campos
  const handleFieldChange = (field: keyof DevelopmentData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const nextStep = () => {
    const stepErrors = validateStep(step);
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors([]);
    setStep(s => Math.min(s + 1, 3));
  };

  const prevStep = () => {
    setErrors([]);
    setStep(s => Math.max(s - 1, 1));
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    const finalErrors = validateStep(step);
    if (finalErrors.length > 0) {
      setErrors(finalErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const success = await onSave(formData);
      if (success) {
        onClose();
      }
    } catch (error) {
      setErrors(['Error al guardar los cambios. Intenta nuevamente.']);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Básico', icon: Info },
    { id: 2, title: 'Técnico', icon: Cpu },
    { id: 3, title: 'Gestión', icon: Users },
  ];

  if (!isOpen || !development) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar Proyecto: ${development.id}`}
      size="xl"
      showCloseButton={true}
    >
      <div className="max-h-[85vh] flex flex-col transition-all duration-300">
        {/* Step Indicator */}
        <div className="px-8 py-6 border-b border-[var(--color-border)] bg-[var(--color-surface-variant)]/30">
          <div className="flex items-center justify-between px-2 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[var(--color-border)] -translate-y-1/2 z-0 mx-8" />
            
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isCompleted = step > s.id;
              
              return (
                <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2
                    ${isActive ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white scale-110 shadow-lg shadow-primary-500/20' : 
                      isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                      'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'}
                  `}>
                    {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                  </div>
                  <Text variant="caption" weight={isActive ? 'bold' : 'medium'} 
                    className={`uppercase tracking-tighter !text-[10px] ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {s.title}
                  </Text>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 min-h-[420px]">
          {errors.length > 0 && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <Text key={`edit-modal-err-${index}`} variant="caption" color="error" weight="medium" className="block">• {error}</Text>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <Input
                    label="Nombre del Proyecto"
                    value={formData.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    required
                    placeholder="Escribe el nombre principal..."
                  />
                </div>
                <div>
                  <Select
                    label="Estado General"
                    value={formData.general_status || ''}
                    onChange={(e) => handleFieldChange('general_status', e.target.value)}
                    options={[
                      { value: 'Pendiente', label: 'Pendiente' },
                      { value: 'En curso', label: 'En curso' },
                      { value: 'Completado', label: 'Completado' },
                      { value: 'Cancelado', label: 'Cancelado' },
                    ]}
                  />
                </div>
              </div>
              <Textarea
                label="Descripción del Requerimiento"
                value={formData.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Detalla los objetivos y alcance del proyecto..."
                rows={6}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Módulo / Proceso"
                  value={formData.module || ''}
                  onChange={(e) => handleFieldChange('module', e.target.value)}
                  placeholder="Ej. Nómina, Inventarios..."
                />
                <Input
                  label="Tipo de Desarrollo"
                  value={formData.type || ''}
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                  placeholder="Ej. Mejora, Error, Nuevo..."
                />
                <Input
                  label="Ambiente de Ejecución"
                  value={formData.environment || ''}
                  onChange={(e) => handleFieldChange('environment', e.target.value)}
                  placeholder="Ej. Web, Desktop, Producción..."
                />
                <Input
                  label="URL del Portal / Repositorio"
                  value={formData.portal_link || ''}
                  onChange={(e) => handleFieldChange('portal_link', e.target.value)}
                  type="url"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Responsable del Proyecto"
                  value={formData.responsible || ''}
                  onChange={(e) => handleFieldChange('responsible', e.target.value)}
                  placeholder="Nombre de quien responde..."
                />
                <Input
                  label="Autoridad Solicitante"
                  value={formData.authority || ''}
                  onChange={(e) => handleFieldChange('authority', e.target.value)}
                  placeholder="Nombre de quien autoriza..."
                />
                <Input
                  label="Área de Impacto"
                  value={formData.area_desarrollo || ''}
                  onChange={(e) => handleFieldChange('area_desarrollo', e.target.value)}
                  placeholder="Departamento afectado..."
                />
                <Input
                  label="Líder Técnico / Analista"
                  value={formData.analista || ''}
                  onChange={(e) => handleFieldChange('analista', e.target.value)}
                  placeholder="Analista a cargo..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--color-border)]/50">
                <Input
                  label="Fecha de Inicio"
                  value={formData.start_date || ''}
                  onChange={(e) => handleFieldChange('start_date', e.target.value)}
                  type="date"
                />
                <Input
                  label="Fecha Estimada de Fin"
                  value={formData.estimated_end_date || ''}
                  onChange={(e) => handleFieldChange('estimated_end_date', e.target.value)}
                  type="date"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex-shrink-0 border-t border-[var(--color-border)] p-8 bg-[var(--color-surface-variant)]/10">
          <div className="flex justify-between items-center w-full">
            <Button
              variant="ghost"
              onClick={step === 1 ? onClose : prevStep}
              disabled={loading}
              className="px-6 h-11"
            >
              {step === 1 ? 'Cancelar' : 'Anterior'}
            </Button>
            
            <div className="flex gap-3">
              {step < 3 ? (
                <Button
                  variant="primary"
                  onClick={nextStep}
                  className="px-8 h-11 rounded-xl"
                >
                  Siguiente
                  <ChevronRight size={18} className="ml-1.5" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-10 h-11 rounded-xl shadow-lg shadow-primary-500/30"
                >
                  {loading ? 'Guardando...' : 'Finalizar Edición'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DevelopmentEditModal;
