import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Title, Button, Input, Select, Textarea } from '../../components/atoms';
import { WbsActivityCreate, WbsActivityUpdate, WbsActivityTree } from '../../types/wbs';

interface WbsNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    developmentId: string;
    parentId?: number | null; // Si existe, es una subactividad
    editNode?: WbsActivityTree | null; // Si existe, es edición
    darkMode: boolean;
}

export const WbsNodeModal: React.FC<WbsNodeModalProps> = ({
    isOpen, onClose, onSaved, developmentId, parentId, editNode, darkMode
}) => {
    const { post, patch } = useApi();
    const [loading, setLoading] = useState(false);

    // Estado del formulario
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [estado, setEstado] = useState<'Pendiente' | 'En Progreso' | 'Bloqueado' | 'Completada'>('Pendiente');
    const [avance, setAvance] = useState(0);

    useEffect(() => {
        if (isOpen) {
            if (editNode) {
                setTitulo(editNode.titulo);
                setDescripcion(editNode.descripcion || '');
                setEstado(editNode.estado);
                setAvance(editNode.porcentaje_avance);
            } else {
                setTitulo('');
                setDescripcion('');
                setEstado('Pendiente');
                setAvance(0);
            }
        }
    }, [isOpen, editNode]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!titulo.trim()) return;
        setLoading(true);

        try {
            if (editNode) {
                // Edit mode
                const payload: WbsActivityUpdate = {
                    titulo,
                    descripcion,
                    estado,
                    porcentaje_avance: parseFloat(avance.toString())
                };
                await patch(`/actividades/${editNode.id}`, payload);
            } else {
                // Create mode
                const payload: WbsActivityCreate = {
                    desarrollo_id: developmentId,
                    parent_id: parentId || undefined,
                    titulo,
                    descripcion,
                    estado,
                    porcentaje_avance: parseFloat(avance.toString()),
                    horas_estimadas: 0,
                };
                await post(`/actividades/`, payload);
            }
            onSaved();
            onClose();
        } catch (error) {
            console.error('Error saving WBS node:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col ${darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white'}`}>
                <div className={`p-6 border-b ${darkMode ? 'border-neutral-700' : ' border-neutral-100'}`}>
                    <div className="flex justify-between items-center">
                        <Title variant="h5" weight="bold">
                            {editNode ? 'Editar Tarea' : parentId ? 'Nueva Sub-tarea' : 'Nueva Tarea Principal'}
                        </Title>
                        <Button variant="ghost" onClick={onClose} icon={X} className="!p-1.5 text-neutral-400 hover:text-neutral-500" />
                    </div>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <Input
                        label="Título de la Tarea"
                        placeholder="Ej. Análisis de Requerimientos"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        required
                    />

                    <Textarea
                        label="Descripción"
                        placeholder="Detalles opcionales..."
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Estado"
                            value={estado}
                            onChange={(e) => setEstado(e.target.value as any)}
                            options={[
                                { value: 'Pendiente', label: 'Pendiente' },
                                { value: 'En Progreso', label: 'En Progreso' },
                                { value: 'Bloqueado', label: 'Bloqueado' },
                                { value: 'Completada', label: 'Completada' },
                            ]}
                        />

                        <Input
                            label="Avance (%)"
                            type="number"
                            value={avance.toString()}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val >= 0 && val <= 100) setAvance(val);
                            }}
                        />
                    </div>
                </div>

                <div className={`p-6 border-t ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-100'} flex justify-end gap-3`}>
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={loading || !titulo.trim()}>
                        {loading ? 'Guardando...' : 'Guardar Tarea'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
