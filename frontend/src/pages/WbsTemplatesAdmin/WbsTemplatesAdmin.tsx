import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Title, Text, Button, MaterialCard } from '../../components/atoms';
import { Plus, ListTodo } from 'lucide-react';
import { WbsActivityTree } from '../../types/wbs';
import { WbsTemplateModal } from './WbsTemplateModal';
import { WbsTemplateTree } from './WbsTemplateTree';

export const WbsTemplatesAdmin: React.FC = () => {
    const { get } = useApi<any>();
    const [templates, setTemplates] = useState<WbsActivityTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<WbsActivityTree | null>(null);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalEditNode, setModalEditNode] = useState<WbsActivityTree | null>(null);
    const [modalParentId, setModalParentId] = useState<number | null>(null);

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
        fetchTemplates();
    }, []);

    const handleCreateTemplate = () => {
        setSelectedTemplate(null);
        setModalEditNode(null);
        setModalParentId(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <Title variant="h3" weight="bold" color="text-primary" className="flex items-center gap-2">
                        <ListTodo className="text-[var(--color-primary)]" size={28} />
                        Plantillas WBS
                    </Title>
                    <Text variant="body1" color="text-secondary">
                        Administra arquetipos de actividades estandarizadas para los nuevos proyectos
                    </Text>
                </div>
                {!selectedTemplate && (
                    <Button variant="primary" icon={Plus} onClick={handleCreateTemplate}>
                        Nueva Plantilla
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Lista de Plantillas */}
                <div className="lg:col-span-1 space-y-4">
                    <MaterialCard className="p-4 flex flex-col h-[calc(100vh-200px)]">
                        <Title variant="h6" weight="bold" className="mb-4">Mis Plantillas</Title>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {loading ? (
                                <Text color="text-secondary" className="text-center py-4">Cargando...</Text>
                            ) : templates.length === 0 ? (
                                <Text color="text-secondary" className="text-center py-4">No hay plantillas creadas.</Text>
                            ) : (
                                templates.map(t => (
                                    <div
                                        key={t.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedTemplate(t)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${selectedTemplate?.id === t.id
                                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                                : 'bg-white border-neutral-200 hover:border-blue-300 dark:bg-neutral-800 dark:border-neutral-700'
                                            }`}
                                    >
                                        <Text weight="bold" className="truncate text-sm">{t.nombre_plantilla}</Text>
                                        <Text variant="caption" color="text-secondary" className="truncate mt-1">
                                            {t.titulo}
                                        </Text>
                                    </div>
                                ))
                            )}
                        </div>
                    </MaterialCard>
                </div>

                {/* Arbol de Plantilla Seleccionada */}
                <div className="lg:col-span-3">
                    {selectedTemplate ? (
                        <WbsTemplateTree
                            rootTemplate={selectedTemplate}
                            onRefresh={fetchTemplates}
                            onClearSelection={() => setSelectedTemplate(null)}
                        />
                    ) : (
                        <MaterialCard className="p-12 h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center mb-4">
                                <ListTodo size={32} />
                            </div>
                            <Title variant="h5" weight="bold" className="mb-2">Ninguna plantilla seleccionada</Title>
                            <Text variant="body1" color="text-secondary" className="max-w-md">
                                Selecciona una plantilla del panel lateral para ver y editar su estructura, o crea una nueva.
                            </Text>
                        </MaterialCard>
                    )}
                </div>
            </div>

            <WbsTemplateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={() => {
                    fetchTemplates();
                    // Optional: fetch specific and select
                }}
                parentId={modalParentId}
                editNode={modalEditNode}
                isRoot={!modalParentId && !modalEditNode}
            />
        </div>
    );
};

export default WbsTemplatesAdmin;
