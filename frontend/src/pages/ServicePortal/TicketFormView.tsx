import React from 'react';
import { ArrowLeft, User, Briefcase, MapPin, Mail, FileText, Clock, ChevronRight } from 'lucide-react';
import { FormField, TextAreaField } from './Common';
import { Button, Select, Title, Text, Icon } from '../../components/atoms';

interface Category {
    id: string; name: string; icon: React.ReactNode; form_type: 'support' | 'development' | 'asset';
}

interface UserData {
    id: string; name: string; email: string; area?: string; cargo?: string; sede?: string;
}

interface TicketFormViewProps {
    selectedCategory: Category;
    user: UserData;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onBack: () => void;
    isLoading: boolean;
}

const TicketFormView: React.FC<TicketFormViewProps> = ({ selectedCategory, user, onSubmit, onBack, isLoading }) => {


    return (
        <div className="space-y-8 py-4">
            <Button
                variant="ghost"
                onClick={onBack}
                icon={ArrowLeft}
                className="font-bold p-0"
            >
                Cambiar categoría
            </Button>

            <div className="bg-[var(--color-surface)] rounded-[2.5rem] shadow-xl border border-[var(--color-border)] overflow-hidden transition-colors duration-300">
                <div className="bg-[var(--deep-navy)] p-8 text-white flex items-center justify-between">
                    <div>
                        <Text variant="caption" className="text-[var(--powder-blue)] font-bold uppercase tracking-widest mb-1">Nueva Solicitud</Text>
                        <Title variant="h3" weight="bold">{selectedCategory.name}</Title>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md h-24 w-24 flex items-center justify-center">{selectedCategory.icon}</div>
                </div>

                <form id="ticket-form" onSubmit={onSubmit} className="p-8 space-y-10">
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                            <Icon name={User} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Información del Solicitante</Title>
                            <div className="flex-grow border-t border-[var(--color-border)]"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField label="Nombre" name="nombre" defaultValue={user.name} readOnly icon={User} />
                            <FormField label="Área" name="area" defaultValue={user.area} readOnly icon={Briefcase} />
                            <FormField label="Sede" name="sede" defaultValue={user.sede} readOnly icon={MapPin} />
                            <FormField label="Correo" name="email" defaultValue={user.email} readOnly icon={Mail} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                            <Icon name={FileText} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Detalles de la Petición</Title>
                            <div className="flex-grow border-t border-[var(--color-border)]"></div>
                        </div>

                        {selectedCategory.form_type !== 'development' && (
                            <>
                                <FormField label="Asunto / Título de la Solicitud" name="asunto" placeholder="Ej: Error al imprimir, Nuevo acceso..." isRequired icon={FileText} />
                                <TextAreaField label="Descripción General" name="descripcion_detallada" placeholder="Describa su requerimiento..." rows={4} />
                            </>
                        )}

                        {selectedCategory.form_type === 'development' && (
                            <div className="space-y-8 bg-[var(--color-surface-variant)]/30 p-8 rounded-3xl border border-[var(--color-border)]">
                                <div className="space-y-4">
                                    <Title variant="h5" className="text-[var(--color-primary)] border-b pb-2">1. Identificación del Proceso</Title>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField label="Nombre del Proceso" name="nombre_proceso" placeholder="Ej: Gestión de Activos" />
                                        <FormField label="Área Solicitante" name="area_solicitante" defaultValue={user.area} />
                                        <FormField label="Usuario Líder" name="lider_requerimiento" defaultValue={user.name} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Title variant="h5" className="text-[var(--color-primary)] border-b pb-2">2. Diagnóstico Actual</Title>
                                    <Select
                                        label="¿Existe actualmente una herramienta en Excel para este proceso?"
                                        name="existe_herramienta"
                                        options={[{ value: 'SI', label: 'Sí' }, { value: 'NO', label: 'No' }]}
                                    />
                                    <FormField label="Referencia de archivos (Ruta compartida o nombre)" name="ruta_archivos" placeholder="Ej: \\192.168.0.3\compartido\archivo.xlsx" />
                                    <TextAreaField label="Limitaciones: ¿Qué funcionalidades faltan o qué errores se buscan solucionar?" name="limitaciones_actuales" placeholder="Describa los problemas actuales..." rows={3} />
                                </div>

                                <div className="space-y-4">
                                    <Title variant="h5" className="text-[var(--color-primary)] border-b pb-2">3. Dinámica (Entrada)</Title>
                                    <TextAreaField label="¿Cuál es la acción o condición que da inicio al proceso en el sistema?" name="evento_iniciador" placeholder="Evento iniciador..." rows={2} />
                                    <TextAreaField label="Liste los datos mínimos necesarios para crear un registro (Campos Obligatorios)" name="campos_obligatorios" placeholder="Lista de campos..." rows={3} />
                                    <TextAreaField label="¿Qué debe validar el sistema antes de permitir el ingreso del dato?" name="validaciones_seguridad" placeholder="Validaciones de seguridad..." rows={2} />
                                </div>

                                <div className="space-y-4">
                                    <Title variant="h5" className="text-[var(--color-primary)] border-b pb-2">4. Flujo de Trabajo (Workflow)</Title>
                                    <TextAreaField label="Defina la secuencia de estados (Ciclo de Vida)" name="ciclo_vida" placeholder="Ej: Registrado -> Aprobado -> Cerrado" rows={2} />
                                    <TextAreaField label="¿Quién tiene la facultad de mover el registro de un estado a otro? (Actores)" name="actores_permisos" placeholder="Roles y permisos..." rows={3} />
                                    <TextAreaField label="Si el flujo no puede continuar, ¿hacia qué estado regresa? (Rechazos)" name="gestion_rechazos" placeholder="Lógica de devolución..." rows={2} />
                                </div>

                                <div className="space-y-4">
                                    <Title variant="h5" className="text-[var(--color-primary)] border-b pb-2">5. Reglas de Negocio</Title>
                                    <TextAreaField label="Describa los cálculos automáticos requeridos" name="calculos_automaticos" placeholder="Fórmulas (usar referencias de Excel)..." rows={3} />
                                    <TextAreaField label="¿Bajo qué condiciones el sistema debe bloquear una acción? (Restricciones)" name="reglas_restriccion" placeholder="Reglas de bloqueo..." rows={2} />
                                    <TextAreaField label="Defina qué datos deben quedar protegidos/inmutables tras avanzar etapas" name="inmutabilidad" placeholder="Campos no editables..." rows={2} />
                                </div>

                                <div className="space-y-4">
                                    <Title variant="h5" className="text-[var(--color-primary)] border-b pb-2">6. Integración y Salida</Title>
                                    <TextAreaField label="¿Qué otros procesos del sistema deben actualizarse automáticamente?" name="impacto_modulos" placeholder="Impacto en otros módulos..." rows={2} />
                                    <TextAreaField label="¿El sistema debe generar algún PDF, ticket o alerta por correo?" name="notificaciones_docs" placeholder="Documentos y notificaciones..." rows={2} />
                                    <TextAreaField label="¿Qué información consolidada necesita extraer? (Reportabilidad y KPIs)" name="reportabilidad" placeholder="Métricas esperadas..." rows={3} />
                                </div>
                            </div>
                        )}

                        {selectedCategory.form_type === 'asset' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField label="Hardware Solicitado" name="hardware_solicitado" placeholder="Ej: Mouse ergonómico" />
                                <FormField label="Marca/Modelo sugerido" name="especificaciones" placeholder="Opcional" />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select
                                label="Prioridad"
                                name="nivel_prioridad"
                                defaultValue="Media"
                                options={[
                                    { value: 'Baja', label: 'Baja' },
                                    { value: 'Media', label: 'Media' },
                                    { value: 'Alta', label: 'Alta' },
                                    { value: 'Crítica', label: 'Crítica' },
                                ]}
                            />
                            <FormField label="Fecha Ideal de Cierre" name="fecha_ideal" type="date" icon={Clock} />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-[var(--color-border)] flex justify-end space-x-4">
                        <Button type="button" variant="ghost" onClick={onBack}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            variant="primary"
                            size="lg"
                            icon={ChevronRight}
                            iconPosition="right"
                        >
                            {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TicketFormView;
