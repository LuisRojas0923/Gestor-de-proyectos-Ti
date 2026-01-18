import React, { useState } from 'react';
import { ArrowLeft, User, Briefcase, MapPin, Mail, FileText, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { FormField, TextAreaField } from './Common';
import { Button, Select, Title, Text, Icon } from '../../components/atoms';
import { callGeminiAPI } from '../../services/GeminiService';

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
    const [interpretationText, setInterpretationText] = useState<string>('');
    const [isInterpreting, setIsInterpreting] = useState<boolean>(false);

    const handleGenerateJustification = async () => {
        const form = document.getElementById('ticket-form') as HTMLFormElement;
        const pq = (form.elements.namedItem('porque') as HTMLTextAreaElement)?.value || '';
        const paq = (form.elements.namedItem('paraque') as HTMLTextAreaElement)?.value || '';
        const qn = (form.elements.namedItem('que_necesita') as HTMLTextAreaElement)?.value || '';

        if (!pq.trim() || !paq.trim() || !qn.trim()) {
            setInterpretationText('Por favor complete: "¿Qué necesita?", "¿Por qué?" y "¿Para qué?"');
            return;
        }

        setIsInterpreting(true);
        const query = `Contexto: ${pq}\nRequerimiento: ${qn}\nObjetivo: ${paq}`;
        const prompt = `Actúa como Asistente de Proyectos. Sintetiza la información en un párrafo profesional (máx 80 palabras) para una Justificación de Solicitud técnica convincente.`;

        try {
            const result = await callGeminiAPI(query, prompt);
            setInterpretationText(result);
        } catch {
            setInterpretationText("Error al conectar con la IA.");
        } finally {
            setIsInterpreting(false);
        }
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
                        <Text variant="caption" className="text-[var(--powder-blue)] font-bold uppercase tracking-widest mb-1">Nueva Solicitud</Text>
                        <Title variant="h3" weight="bold">{selectedCategory.name}</Title>
                    </div>
                    <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">{selectedCategory.icon}</div>
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

                        <TextAreaField label="Descripción General" name="descripcion_detallada" placeholder="Describa su requerimiento..." rows={4} />

                        {selectedCategory.form_type === 'development' && (
                            <div className="space-y-6 bg-[var(--color-surface-variant)]/30 p-6 rounded-3xl border border-[var(--color-border)]">
                                <TextAreaField label="¿Qué necesita específicamente? (El QUÉ)" name="que_necesita" placeholder="Funcionalidades clave..." />
                                <TextAreaField label="¿Por qué lo necesita? (El POR QUÉ)" name="porque" placeholder="Problema actual..." />
                                <TextAreaField label="¿Para qué se usará? (El PARA QUÉ)" name="paraque" placeholder="Impacto esperado..." />

                                <Button
                                    type="button"
                                    onClick={handleGenerateJustification}
                                    disabled={isInterpreting}
                                    variant="primary"
                                    size="lg"
                                    icon={Sparkles}
                                    className="w-full"
                                >
                                    {isInterpreting ? 'Generando...' : 'Generar Justificación IA ✨'}
                                </Button>
                                {interpretationText && interpretationText !== 'Generando...' && (
                                    <TextAreaField label="Justificación Técnica Sugerida" name="justificacion_ia" defaultValue={interpretationText} rows={3} />
                                )}
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
