import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Info, Users, ClipboardList, CheckCircle2 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Title, Button, Input, Select, Textarea, Text } from '../../components/atoms';
import { WbsActivityCreate, WbsActivityUpdate, WbsActivityTree } from '../../types/wbs';
import { AssignableUserSelect } from '../../components/assignments/AssignableUserSelect';
import { useAppContext } from '../../context/AppContext';

interface WbsNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    developmentId: string;
    editNode?: WbsActivityTree | null;
    darkMode: boolean;
}

export const WbsNodeModal: React.FC<WbsNodeModalProps> = ({
    isOpen, onClose, onSaved, developmentId, editNode, darkMode
}) => {
    const { post, patch } = useApi();
    const { state } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    // Estado del formulario
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [estado, setEstado] = useState<'Pendiente' | 'En Progreso' | 'Bloqueado' | 'Completada'>('Pendiente');
    const [avance, setAvance] = useState(0);
    const [seguimiento, setSeguimiento] = useState('');
    const [compromiso, setCompromiso] = useState('');
    const [archivoUrl, setArchivoUrl] = useState('');
    const [responsableId, setResponsableId] = useState('');
    const [asignadoAId, setAsignadoAId] = useState('');

    useEffect(() => {
        if (estado === 'Completada') setAvance(100);
        else if (estado !== 'En Progreso' && estado !== 'Bloqueado') setAvance(0);
    }, [estado]);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            if (editNode) {
                setTitulo(editNode.titulo);
                setDescripcion(editNode.descripcion || '');
                setEstado(editNode.estado);
                setAvance(editNode.porcentaje_avance);
                setSeguimiento(editNode.seguimiento || '');
                setCompromiso(editNode.compromiso || '');
                setArchivoUrl(editNode.archivo_url || '');
                setResponsableId(editNode.responsable_id || '');
                setAsignadoAId(editNode.asignado_a_id || '');
            } else {
                setTitulo('');
                setDescripcion('');
                setEstado('Pendiente');
                setAvance(0);
                setSeguimiento('');
                setCompromiso('');
                setArchivoUrl('');
                setResponsableId('');
                setAsignadoAId('');
            }
        }
    }, [isOpen, editNode]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!titulo.trim()) return;
        setLoading(true);

        try {
            if (editNode) {
                const payload: WbsActivityUpdate = {
                    titulo,
                    descripcion,
                    estado,
                    porcentaje_avance: parseFloat(avance.toString()),
                    responsable_id: responsableId || undefined,
                    asignado_a_id: asignadoAId || undefined,
                    delegado_por_id: state.user?.id || undefined,
                    seguimiento,
                    compromiso,
                    archivo_url: archivoUrl
                };
                await patch(`/actividades/${editNode.id}`, payload);
            } else {
                const payload: WbsActivityCreate = {
                    desarrollo_id: developmentId,
                    titulo,
                    descripcion,
                    estado,
                    porcentaje_avance: parseFloat(avance.toString()),
                    horas_estimadas: 0,
                    responsable_id: responsableId || undefined,
                    asignado_a_id: asignadoAId || undefined,
                    delegado_por_id: state.user?.id || undefined,
                    seguimiento,
                    compromiso,
                    archivo_url: archivoUrl
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

    const nextStep = () => setStep(s => Math.min(s + 1, 3));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const steps = [
        { id: 1, title: 'Básico', icon: Info },
        { id: 2, title: 'Asignación', icon: Users },
        { id: 3, title: 'Bitácora', icon: ClipboardList },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] transition-all duration-300">
                {/* Header con Step Indicator */}
                <div className="p-6 border-b border-[var(--color-border)] bg-[var(--color-surface-variant)]/30">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[var(--color-primary)]/10 rounded-xl text-[var(--color-primary)]">
                                <ClipboardList size={20} />
                            </div>
                            <Title variant="h5" weight="bold">
                                {editNode ? 'Editar Tarea' : 'Nueva Tarea'}
                            </Title>
                        </div>
                        <Button variant="ghost" onClick={onClose} icon={X} className="!p-1.5 text-neutral-400 hover:text-neutral-500 rounded-full" />
                    </div>

                    <div className="flex items-center justify-between px-2 relative">
                        {/* Línea de fondo */}
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
                                        className={isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}>
                                        {s.title}
                                    </Text>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Contenido Dinámico */}
                <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] min-h-[380px] custom-scrollbar">
                    {step === 1 && (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                            <Input
                                label="Título de la Tarea"
                                placeholder="Ej. Análisis de Requerimientos"
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                required
                                className="text-sm font-medium"
                            />
                            <Textarea
                                label="Descripción"
                                placeholder="Detalles opcionales sobre el alcance..."
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                rows={4}
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-1 gap-5">
                                <Select
                                    label="Estado Actual"
                                    value={estado}
                                    onChange={(e) => setEstado(e.target.value as any)}
                                    options={[
                                        { value: 'Pendiente', label: 'Pendiente' },
                                        { value: 'En Progreso', label: 'En Progreso' },
                                        { value: 'Bloqueado', label: 'Bloqueado' },
                                        { value: 'Completada', label: 'Completada' },
                                    ]}
                                />
                            </div>
                            <div className="space-y-4 pt-2 border-t border-[var(--color-border)]/50">
                                <AssignableUserSelect
                                    label="Responsable"
                                    value={responsableId}
                                    onChange={setResponsableId}
                                    helperText="Persona que responde por la entrega."
                                />
                                <AssignableUserSelect
                                    label="Líder de actividad"
                                    value={asignadoAId}
                                    onChange={setAsignadoAId}
                                    helperText="Persona que ejecutará la tarea técnica."
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                            <Textarea
                                label="Seguimiento / Bitácora"
                                placeholder="Avances, hallazgos y notas de ejecución..."
                                value={seguimiento}
                                onChange={(e) => setSeguimiento(e.target.value)}
                                rows={3}
                            />
                            <Textarea
                                label="Compromisos"
                                placeholder="Acuerdos o fechas clave..."
                                value={compromiso}
                                onChange={(e) => setCompromiso(e.target.value)}
                                rows={2}
                            />
                            <Input
                                label="URL de Evidencia / Entregable"
                                placeholder="https://sharepoint.com/..."
                                value={archivoUrl}
                                onChange={(e) => setArchivoUrl(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Footer con Navegación */}
                <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-surface-variant)]/20 flex justify-between items-center">
                    <Button 
                        variant="ghost" 
                        onClick={step === 1 ? onClose : prevStep} 
                        disabled={loading}
                        className="px-5"
                    >
                        {step === 1 ? 'Cancelar' : 'Anterior'}
                    </Button>
                    
                    <div className="flex gap-3">
                        {step < 3 ? (
                            <Button 
                                variant="primary" 
                                onClick={nextStep} 
                                disabled={step === 1 && !titulo.trim()}
                                className="px-6 rounded-xl"
                            >
                                Siguiente
                                <ChevronRight size={18} className="ml-1" />
                            </Button>
                        ) : (
                            <Button 
                                variant="primary" 
                                onClick={handleSave} 
                                disabled={loading || !titulo.trim()}
                                className="px-8 rounded-xl shadow-lg shadow-primary-500/30"
                            >
                                {loading ? 'Guardando...' : editNode ? 'Actualizar Tarea' : 'Crear Tarea'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
