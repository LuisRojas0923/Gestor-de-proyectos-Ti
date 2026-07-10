import React, { useRef } from 'react';
import { ArrowLeft, User, Briefcase, MapPin, Mail, FileText, Clock, ChevronRight, Users } from 'lucide-react';
import { FormField, TextAreaField } from './Common';
import { Button, Select, Title, Text, Icon } from '../../../components/atoms';
import { useTicketForm } from '../hooks/useTicketForm';
import { FileAttachmentSection } from '../components/FileAttachmentSection';
import { SEDES_LIST } from '../../../config/sedes';

interface Category {
    id: string;
    name: string;
    icon: React.ReactNode;
    form_type: 'support' | 'development' | 'asset' | 'change_control' | 'improvement_support';
    section: 'soporte' | 'mejoramiento' | 'rrhh';
}

interface UserData {
    id: string; cedula: string; name: string; email: string; area?: string; cargo?: string; sede?: string;
}

interface PersonnelRequestViewProps {
    user: UserData;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onBack: () => void;
    isLoading: boolean;
    selectedFiles: File[];
    onFilesChange: React.Dispatch<React.SetStateAction<File[]>>;
}

const PersonnelRequestView: React.FC<PersonnelRequestViewProps> = ({ user, onSubmit, onBack, isLoading, selectedFiles, onFilesChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Categoría virtual para RRHH
    const virtualCategory: Category = {
        id: 'solicitud_personal',
        name: 'Solicitud de Personal',
        icon: <Users className="w-12 h-12 text-white" />,
        form_type: 'support',
        section: 'rrhh'
    };

    const {
        calculatedPriority, setCalculatedPriority, handleFileChange, removeFile
    } = useTicketForm(virtualCategory as any, onFilesChange);

    const getCurrentDateTimeLocal = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        return new Date(now.getTime() - offset).toISOString().slice(0, 16);
    };

    const defaultDateTime = getCurrentDateTimeLocal();

    return (
        <div className="space-y-8 py-4">
            <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="font-bold p-0"> Volver al inicio </Button>

            <div className="bg-[var(--color-surface)] rounded-[2.5rem] shadow-xl border border-[var(--color-border)] overflow-hidden transition-colors duration-300">
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-8 text-white flex items-center justify-between">
                    <div>
                        <Text variant="caption" color="inherit" className="text-blue-200 font-bold uppercase tracking-widest mb-1">Recursos Humanos</Text>
                        <Title variant="h3" weight="bold" color="white">Solicitud de Personal</Title>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md h-24 w-24 flex items-center justify-center">
                        <Users size={48} />
                    </div>
                </div>

                <form id="personnel-request-form" onSubmit={onSubmit} className="p-8 space-y-10">
                    {/* Información del Solicitante */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                            <Icon name={User} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Información del Solicitante</Title>
                            <div className="flex-grow border-t border-[var(--color-border)]"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField label="Nombre" name="nombre" defaultValue={user.name} readOnly icon={User} />
                            <FormField label="Área" name="area" defaultValue={user.area} readOnly icon={Briefcase} />
                            <Select
                                label="Ciudad de Contratación"
                                name="sede"
                                defaultValue={user.sede}
                                icon={MapPin}
                                options={SEDES_LIST}
                            />
                            <FormField label="Correo" name="email" defaultValue={user.email} icon={Mail} />
                        </div>
                    </div>

                    {/* Detalles de la Petición */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                            <Icon name={FileText} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Detalles de la Vacante</Title>
                            <div className="flex-grow border-t border-[var(--color-border)]"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField label="Cargo a Solicitar" name="cargo_solicitado" isRequired icon={Briefcase} placeholder="Ej: Especialista de TI" />
                            <FormField label="Cantidad de Personas" name="cantidad" type="number" isRequired icon={Users} defaultValue="1" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField label="OT (Orden de Trabajo)" name="ot" defaultValue="N/A" icon={FileText} placeholder="Ingrese la OT o N/A" />
                            <FormField label="Nombre Obra / Proyecto / Área" name="nombre_proyecto" isRequired icon={Briefcase} placeholder="Nombre del proyecto" />
                            <FormField label="Dirección de Obra / Regional" name="direccion_laboral" isRequired icon={MapPin} placeholder="Dirección de trabajo" />
                        </div>

                        <TextAreaField
                            label="Justificación de la solicitud"
                            name="descripcion_detallada"
                            placeholder="Describa brevemente por qué requiere este personal y cuáles serán sus funciones principales..."
                            rows={4}
                            isRequired
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Select
                                    label="Urgencia de la Vacante"
                                    name="nivel_prioridad"
                                    value={calculatedPriority}
                                    onChange={(e) => setCalculatedPriority(e.target.value)}
                                    options={[
                                        { value: 'Baja', label: 'Baja' }, { value: 'Media', label: 'Media' },
                                        { value: 'Alta', label: 'Alta' }, { value: 'Crítica', label: 'Crítica' },
                                    ]}
                                />
                            </div>
                            <div className="space-y-4">
                                <FormField
                                    label="Fecha Estimada de Ingreso"
                                    name="fecha_ideal"
                                    type="date"
                                    icon={Clock}
                                    isRequired
                                />
                            </div>
                        </div>

                        <FileAttachmentSection
                            fileInputRef={fileInputRef}
                            handleFileChange={handleFileChange}
                            selectedFiles={selectedFiles}
                            removeFile={removeFile}
                        />
                    </div>

                    <div className="pt-6 border-t border-[var(--color-border)] flex justify-end space-x-4">
                        <Button type="button" variant="ghost" onClick={onBack}> Cancelar </Button>
                        <Button type="submit" disabled={isLoading} variant="primary" size="lg" icon={ChevronRight} iconPosition="right">
                            {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PersonnelRequestView;
