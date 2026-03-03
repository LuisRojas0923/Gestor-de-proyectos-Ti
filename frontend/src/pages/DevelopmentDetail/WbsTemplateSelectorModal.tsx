import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Title, Text, Button } from '../../components/atoms';
import { X } from 'lucide-react';
import { WbsActivityTree } from '../../types/wbs';

interface WbsTemplateSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (plantillaRaizId: number) => Promise<void>;
}

export const WbsTemplateSelectorModal: React.FC<WbsTemplateSelectorModalProps> = ({
    isOpen, onClose, onApply
}) => {
    const { get } = useApi<any>();
    const [templates, setTemplates] = useState<WbsActivityTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

    const isDarkMode = document.documentElement.classList.contains('dark');

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const data = await get('/desarrollos/plantillas/raices');
            if (data) setTemplates(data);
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
            setSelectedTemplateId(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleApply = async () => {
        if (!selectedTemplateId) return;
        setApplying(true);
        try {
            await onApply(selectedTemplateId);
            onClose();
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl flex flex-col ${isDarkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white'}`}>
                <div className={`p-6 border-b ${isDarkMode ? 'border-neutral-700' : ' border-neutral-100'}`}>
                    <div className="flex justify-between items-center">
                        <Title variant="h5" weight="bold">
                            Importar Plantilla WBS
                        </Title>
                        <Button variant="ghost" onClick={onClose} icon={X} className="!p-1.5 text-neutral-400 hover:text-neutral-500" />
                    </div>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <Text color="text-secondary" className="text-center py-4">Cargando plantillas disponibles...</Text>
                    ) : templates.length === 0 ? (
                        <Text color="text-secondary" className="text-center py-4">No hay plantillas disponibles. Crea una desde el panel de Configuración de WBS.</Text>
                    ) : (
                        <div className="space-y-2">
                            {templates.map(t => (
                                <div
                                    key={t.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedTemplateId(t.id)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                                        selectedTemplateId === t.id 
                                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                                        : 'bg-white border-neutral-200 hover:border-blue-300 dark:bg-neutral-800 dark:border-neutral-700'
                                    }`}
                                >
                                    <Text weight="bold" className="truncate">{t.nombre_plantilla}</Text>
                                    <Text variant="caption" color="text-secondary" className="truncate mt-1">
                                        {t.titulo}
                                    </Text>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`p-6 border-t ${isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-100'} flex justify-end gap-3 rounded-b-2xl`}>
                    <Button variant="ghost" onClick={onClose} disabled={applying}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleApply} disabled={applying || !selectedTemplateId}>
                        {applying ? 'Importando...' : 'Aplicar Plantilla'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
