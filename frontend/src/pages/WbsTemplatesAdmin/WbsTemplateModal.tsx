import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Title, Button, Input, Textarea } from '../../components/atoms';
import { X } from 'lucide-react';
import { WbsActivityTree } from '../../types/wbs';

interface WbsTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: (newId?: number) => void;
    parentId?: number | null;
    editNode?: WbsActivityTree | null;
    isRoot?: boolean;
}

export const WbsTemplateModal: React.FC<WbsTemplateModalProps> = ({
    isOpen, onClose, onSaved, parentId, editNode, isRoot
}) => {
    const { post, patch } = useApi();
    const [loading, setLoading] = useState(false);

    // Form state
    const [nombrePlantilla, setNombrePlantilla] = useState('');
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [horasEstimadas, setHorasEstimadas] = useState(0);

    const isDarkMode = document.documentElement.classList.contains('dark');

    useEffect(() => {
        if (isOpen) {
            if (editNode) {
                setNombrePlantilla(editNode.nombre_plantilla || '');
                setTitulo(editNode.titulo);
                setDescripcion(editNode.descripcion || '');
                setHorasEstimadas(editNode.horas_estimadas || 0);
            } else {
                setNombrePlantilla('');
                setTitulo('');
                setDescripcion('');
                setHorasEstimadas(0);
            }
        }
    }, [isOpen, editNode]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!titulo.trim() || (isRoot && !nombrePlantilla.trim())) return;
        setLoading(true);

        try {
            if (editNode) {
                const payload = {
                    nombre_plantilla: nombrePlantilla,
                    titulo,
                    descripcion,
                    horas_estimadas: Number(horasEstimadas)
                };
                await patch(`/desarrollos/plantillas/${editNode.id}`, payload);
                onSaved();
            } else {
                const payload = {
                    nombre_plantilla: isRoot ? nombrePlantilla : 'inherited', // Backend expects something, but parent id matters
                    parent_id: parentId || undefined,
                    titulo,
                    descripcion,
                    horas_estimadas: Number(horasEstimadas)
                };
                const res = await post(`/desarrollos/plantillas/`, payload);
                onSaved((res as any)?.id);
            }
            onClose();
        } catch (error) {
            console.error('Error saving template:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col ${isDarkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white'}`}>
                <div className={`p-6 border-b ${isDarkMode ? 'border-neutral-700' : ' border-neutral-100'}`}>
                    <div className="flex justify-between items-center">
                        <Title variant="h5" weight="bold">
                            {editNode ? 'Editar Plantilla' : isRoot ? 'Nueva Plantilla' : 'Nueva Sub-actividad'}
                        </Title>
                        <Button variant="ghost" onClick={onClose} icon={X} className="!p-1.5 text-neutral-400 hover:text-neutral-500" />
                    </div>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {isRoot && (
                        <Input
                            label="Nombre de la Plantilla (Grupo)"
                            placeholder="Ej. Implementación ERP Estandar"
                            value={nombrePlantilla}
                            onChange={(e) => setNombrePlantilla(e.target.value)}
                            required
                        />
                    )}

                    <Input
                        label="Título de la Actividad"
                        placeholder="Ej. Análisis de Requerimientos"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        required
                    />

                    <Textarea
                        label="Descripción (Opcional)"
                        placeholder="Instrucciones estándar para esta actividad..."
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                    />

                    <Input
                        label="Horas Estimadas Base"
                        type="number"
                        value={horasEstimadas.toString()}
                        onChange={(e) => setHorasEstimadas(Number(e.target.value))}
                    />
                </div>

                <div className={`p-6 border-t ${isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-100'} flex justify-end gap-3 rounded-b-2xl`}>
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={loading || !titulo.trim() || (isRoot && !nombrePlantilla.trim())}>
                        {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
