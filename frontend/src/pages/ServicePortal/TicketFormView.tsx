import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Briefcase, MapPin, Mail, FileText, Clock, ChevronRight, Paperclip, X, Search, Database } from 'lucide-react';
import { FormField, TextAreaField } from './Common';
import { Button, Select, Title, Text, Icon, Input } from '../../components/atoms';
import axios from 'axios';
import { API_CONFIG } from '../../config/api';

interface Category {
    id: string; name: string; icon: React.ReactNode; form_type: 'support' | 'development' | 'asset' | 'change_control';
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
    selectedFiles: File[];
    onFilesChange: React.Dispatch<React.SetStateAction<File[]>>;
}

const TicketFormView: React.FC<TicketFormViewProps> = ({ selectedCategory, user, onSubmit, onBack, isLoading, selectedFiles, onFilesChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [developments, setDevelopments] = useState<any[]>([]);

    useEffect(() => {
        if (selectedCategory.form_type === 'change_control') {
            const fetchDevelopments = async () => {
                try {
                    const res = await axios.get(`${API_CONFIG.BASE_URL}/desarrollos/`);
                    setDevelopments(res.data);
                } catch (err) {
                    console.error("Error fetching developments:", err);
                }
            };
            fetchDevelopments();
        }
    }, [selectedCategory.form_type]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            onFilesChange(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        onFilesChange(prev => prev.filter((_, i) => i !== index));
    };


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
                        <Text variant="caption" color="inherit" className="text-[var(--powder-blue)] font-bold uppercase tracking-widest mb-1">Nueva Solicitud</Text>
                        <Title variant="h3" weight="bold" color="white">{selectedCategory.name}</Title>
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
                                    <FormField label="Referencia de archivos (Ruta compartida o nombre)" name="ruta_archivos" placeholder="Ej: \\SERVIDOR-TI\compartido\archivo.xlsx" />
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

                        {selectedCategory.form_type === 'change_control' && (
                            <div className="space-y-8 bg-emerald-50/30 dark:bg-emerald-900/10 p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800">
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <Icon name={Database} size="sm" className="text-emerald-500" />
                                        <Title variant="h5" className="text-emerald-600 dark:text-emerald-400">1. Origen del Cambio</Title>
                                    </div>
                                    <Select
                                        label="Proyecto / Desarrollo a Modificar"
                                        name="desarrollo_id"
                                        required
                                        options={[
                                            { value: '', label: '-- Seleccione un proyecto --' },
                                            ...developments.map(d => ({ value: d.id, label: `${d.id} - ${d.name}` }))
                                        ]}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Select
                                            label="Tipo de Objeto"
                                            name="tipo_objeto"
                                            required
                                            options={[
                                                { value: 'Informe/Reporte', label: 'Informe / Reporte' },
                                                { value: 'Proceso/Ventana', label: 'Proceso / Ventana' },
                                                { value: 'Maestro/Parametro', label: 'Maestro / Parámetro' },
                                                { value: 'Interfaz/API', label: 'Interfaz / API' }
                                            ]}
                                        />
                                        <Select
                                            label="Acción Requerida"
                                            name="accion_requerida"
                                            required
                                            options={[
                                                { value: 'Corregir Error', label: 'Corregir Error' },
                                                { value: 'Agregar Funcionalidad', label: 'Nueva Funcionalidad' },
                                                { value: 'Modificar Existente', label: 'Modificar Existente' },
                                                { value: 'Eliminar Campo', label: 'Eliminar Campo / Lógica' }
                                            ]}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 border-t border-emerald-100 dark:border-emerald-800 pt-4">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <Icon name={FileText} size="sm" className="text-emerald-500" />
                                        <Title variant="h5" className="text-emerald-600 dark:text-emerald-400">2. Detalle de la Solicitud</Title>
                                    </div>
                                    <FormField label="Título del Ajuste" name="asunto" placeholder="Ej: Agregar NIT en Informe de Gastos" isRequired icon={Search} />
                                    <TextAreaField
                                        label="Descripción del Cambio"
                                        name="descripcion_cambio"
                                        placeholder="Describa qué se debe cambiar a nivel técnico o funcional..."
                                        rows={3}
                                        isRequired
                                    />
                                    <TextAreaField
                                        label="Justificación de Negocio"
                                        name="justificacion_cambio"
                                        placeholder="¿Por qué es necesario este cambio? ¿Qué impacto genera si no se hace?"
                                        rows={2}
                                        isRequired
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-emerald-100 dark:border-emerald-800 pt-4">
                                    <Select
                                        label="Impacto Operativo"
                                        name="impacto_operativo"
                                        defaultValue="Medio"
                                        options={[
                                            { value: 'Bajo', label: 'Bajo (Estético / Informativo)' },
                                            { value: 'Medio', label: 'Medio (Funcionalidad importante)' },
                                            { value: 'Alto', label: 'Alto (Bloqueante / Error crítico)' }
                                        ]}
                                    />
                                    <FormField label="Fecha Sugerida de Entrega" name="fecha_sugerida" type="date" icon={Clock} />
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

                        {/* Nueva sección de Adjuntos */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                                <Icon name={Paperclip} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Documentación y Adjuntos</Title>
                                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="p-8 border-2 border-dashed border-[var(--color-border)] rounded-3xl bg-[var(--color-surface-variant)]/10 hover:bg-[var(--color-surface-variant)]/20 transition-all cursor-pointer group"
                            >
                                <div className="flex flex-col items-center justify-center space-y-3">
                                    <div className="p-4 bg-[var(--color-primary)]/10 rounded-2xl text-[var(--color-primary)] group-hover:scale-110 transition-transform">
                                        <Paperclip size={32} />
                                    </div>
                                    <Text variant="body2" weight="bold">Haz clic para subir archivos o capturas</Text>
                                    <Text variant="caption" color="text-secondary">Soporte para imágenes, PDF y documentos técnicos</Text>
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                        name="archivos_adjuntos"
                                    />
                                </div>
                            </div>

                            {selectedFiles.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {selectedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm">
                                            <div className="flex items-center space-x-3 overflow-hidden">
                                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <Text variant="body2" weight="bold" className="truncate block">{file.name}</Text>
                                                    <Text variant="caption" color="text-secondary">{(file.size / 1024).toFixed(1)} KB</Text>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeFile(idx)}
                                                className="!p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-500 rounded-xl transition-colors"
                                                icon={X}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
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
