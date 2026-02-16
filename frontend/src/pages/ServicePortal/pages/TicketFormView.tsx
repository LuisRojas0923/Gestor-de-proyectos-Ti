import React, { useRef } from 'react';
import { ArrowLeft, User, Briefcase, MapPin, Mail, FileText, Clock, ChevronRight } from 'lucide-react';
import { FormField, TextAreaField } from './Common';
import { Button, Select, Title, Text, Icon } from '../../../components/atoms';
import { useTicketForm } from '../hooks/useTicketForm';
import { ImpactedAreasSelection } from '../components/ImpactedAreasSelection';
import { FileAttachmentSection } from '../components/FileAttachmentSection';
import { SupportSection, DevelopmentSection, ChangeControlSection, AssetSection, ImprovementSupportSection } from '../components/TicketFormSections';

interface Category {
    id: string;
    name: string;
    icon: React.ReactNode;
    form_type: 'support' | 'development' | 'asset' | 'change_control' | 'improvement_support';
    section: 'soporte' | 'mejoramiento';
    subCategories?: { id: string; name: string; form_type?: string }[];
}

interface UserData {
    id: string; cedula: string; name: string; email: string; area?: string; cargo?: string; sede?: string;
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
    const [activeSubCategoryId, setActiveSubCategoryId] = React.useState<string | null>(null);

    const {
        modules, components, selectedModuleId, setSelectedModuleId, impactedAreas, areaInput, setAreaInput,
        calculatedPriority, setCalculatedPriority, handleImpactChange, addArea, removeArea, handleFileChange, removeFile
    } = useTicketForm(selectedCategory, onFilesChange);

    const getCurrentDateTimeLocal = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        return new Date(now.getTime() - offset).toISOString().slice(0, 16);
    };

    const defaultDateTime = getCurrentDateTimeLocal();
    const defaultDate = defaultDateTime.split('T')[0];

    // Determinar el tipo de formulario efectivo (considerando subcategorías)
    const activeSubCat = selectedCategory.subCategories?.find(sc => sc.id === activeSubCategoryId);
    const effectiveFormType = activeSubCat?.form_type || selectedCategory.form_type;

    return (
        <div className="space-y-8 py-4">
            <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="font-bold p-0"> Cambiar categoría </Button>

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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" key={`${user.cedula}-${user.sede}-${user.area}`}>
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

                        {selectedCategory.form_type === 'support' && (
                            <SupportSection
                                category={selectedCategory}
                                onSubCategoryChange={(id) => setActiveSubCategoryId(id)}
                            />
                        )}
                        {selectedCategory.form_type === 'improvement_support' && <ImprovementSupportSection category={selectedCategory} />}
                        {selectedCategory.form_type === 'development' && <DevelopmentSection userArea={user.area || ''} userName={user.name} />}
                        {selectedCategory.form_type === 'change_control' && (
                            <ChangeControlSection
                                modules={modules}
                                components={components}
                                selectedModuleId={selectedModuleId}
                                setSelectedModuleId={setSelectedModuleId}
                                handleImpactChange={handleImpactChange}
                            />
                        )}
                        {/* Renderizar AssetSection si el formulario base es asset O si la subcategoría seleccionada es asset */}
                        {(effectiveFormType === 'asset' || selectedCategory.form_type === 'asset') && (
                            <AssetSection categoryId={activeSubCategoryId || selectedCategory.id} />
                        )}

                        {(selectedCategory.form_type === 'change_control' || selectedCategory.form_type === 'development') && (
                            <ImpactedAreasSelection
                                areaInput={areaInput}
                                setAreaInput={setAreaInput}
                                addArea={addArea}
                                impactedAreas={impactedAreas}
                                removeArea={removeArea}
                            />
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Select
                                    label="Nivel de Prioridad"
                                    name="nivel_prioridad"
                                    value={calculatedPriority}
                                    onChange={(e) => setCalculatedPriority(e.target.value)}
                                    options={[
                                        { value: 'Baja', label: 'Baja' }, { value: 'Media', label: 'Media' },
                                        { value: 'Alta', label: 'Alta' }, { value: 'Crítica', label: 'Crítica' },
                                    ]}
                                />
                                <TextAreaField label="Justifique la prioridad asignada" name="justificacion_prioridad" rows={2} isRequired />
                            </div>
                            <div className="space-y-4">
                                {selectedCategory.form_type === 'asset' && (
                                    <FormField label="Fecha Ideal de Cierre / Atención" name="fecha_ideal" type="date" icon={Clock} isRequired defaultValue={defaultDate} />
                                )}
                                {(selectedCategory.form_type === 'development' || selectedCategory.section === 'mejoramiento') && (
                                    <FormField label="Fecha y Hora Propuesta Reunión Inicial" name="fecha_reunion" type="datetime-local" isRequired defaultValue={defaultDateTime} />
                                )}
                                {selectedCategory.section === 'soporte' && selectedCategory.form_type === 'support' && (
                                    <FormField label="¿Cuándo ocurrió el problema?" name="fecha_ocurrencia" type="datetime-local" isRequired defaultValue={defaultDateTime} />
                                )}
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

export default TicketFormView;
