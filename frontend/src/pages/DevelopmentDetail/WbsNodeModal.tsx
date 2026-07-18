import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Info, Users, ClipboardList, CheckCircle2 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Title, Button, Input, Select, Textarea, Text, ProgressBar, Checkbox } from '../../components/atoms';
import { WbsActivityCreate, WbsActivityUpdate, WbsActivityTree } from '../../types/wbs';
import { AssignableUserSelect } from '../../components/assignments/AssignableUserSelect';
import { useAppContext } from '../../context/AppContext';
import FilePicker from '../../components/molecules/FilePicker';
import { ActivityEvidenceButton } from './components/ActivityEvidenceButton';
import Modal from '../../components/molecules/Modal';
import { API_ENDPOINTS } from '../../config/api';

interface ActivityEvidenceUploadResponse {
    archivo_url: string;
    nombre_archivo: string;
    tipo_mime: string;
    tamano_bytes: number;
}

interface WbsNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    developmentId: string;
    editNode?: WbsActivityTree | null;
    darkMode: boolean;
}

export const WbsNodeModal: React.FC<WbsNodeModalProps> = ({
    isOpen, onClose, onSaved, developmentId, editNode
}) => {
    const { post, patch } = useApi<WbsActivityTree>();
    const { post: uploadEvidence } = useApi<ActivityEvidenceUploadResponse>();
    const { state } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    // Estado del formulario
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [estado, setEstado] = useState<'Pendiente' | 'En Proceso' | 'Pausa' | 'Completada'>('Pendiente');
    const [avance, setAvance] = useState(0);
    const [seguimiento, setSeguimiento] = useState('');
    const [compromiso, setCompromiso] = useState('');
    const [compromisoFecha, setCompromisoFecha] = useState('');
    const [compromisoCumplido, setCompromisoCumplido] = useState(false);
    const [archivoUrl, setArchivoUrl] = useState('');
    const [archivo, setArchivo] = useState<File | null>(null);
    const [persistedActivityId, setPersistedActivityId] = useState<number | null>(null);
    const [saveError, setSaveError] = useState('');
    const [responsableId, setResponsableId] = useState('');
    const [asignadoAId, setAsignadoAId] = useState('');
    
    // Fechas
    const [fechaInicioEstimada, setFechaInicioEstimada] = useState('');
    const [fechaFinEstimada, setFechaFinEstimada] = useState('');
    const [fechaInicioReal, setFechaInicioReal] = useState('');
    const [fechaFinReal, setFechaFinReal] = useState('');

    useEffect(() => {
        if (estado === 'Completada') setAvance(100);
        else if (estado !== 'En Proceso' && estado !== 'Pausa') setAvance(0);
    }, [estado]);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setArchivo(null);
            setPersistedActivityId(editNode?.id || null);
            setSaveError('');
            if (editNode) {
                setTitulo(editNode.titulo);
                setDescripcion(editNode.descripcion || '');
                setEstado(editNode.estado);
                setAvance(editNode.porcentaje_avance);
                setSeguimiento(editNode.seguimiento || '');
                setCompromiso(editNode.compromiso || '');
                setCompromisoFecha(editNode.compromiso_fecha || '');
                setCompromisoCumplido(editNode.compromiso_cumplido || false);
                setArchivoUrl(editNode.archivo_url || '');
                setResponsableId(editNode.responsable_id || '');
                setAsignadoAId(editNode.asignado_a_id || '');
                setFechaInicioEstimada(editNode.fecha_inicio_estimada || '');
                setFechaFinEstimada(editNode.fecha_fin_estimada || '');
                setFechaInicioReal(editNode.fecha_inicio_real || '');
                setFechaFinReal(editNode.fecha_fin_real || '');
            } else {
                setTitulo('');
                setDescripcion('');
                setEstado('Pendiente');
                setAvance(0);
                setSeguimiento('');
                setCompromiso('');
                setCompromisoFecha('');
                setCompromisoCumplido(false);
                setArchivoUrl('');
                setResponsableId('');
                setAsignadoAId('');
                setFechaInicioEstimada('');
                setFechaFinEstimada('');
                setFechaInicioReal('');
                setFechaFinReal('');
            }
        }
    }, [isOpen, editNode]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!titulo.trim()) return;
        setLoading(true);
        setSaveError('');

        let activityPersisted = false;
        try {
            let activityId = editNode?.id || persistedActivityId;
            if (activityId) {
                const payload: WbsActivityUpdate = {
                    titulo,
                    descripcion,
                    estado,
                    porcentaje_avance: parseFloat(avance.toString()),
                    responsable_id: responsableId || undefined,
                    asignado_a_id: asignadoAId || undefined,
                    seguimiento,
                    compromiso,
                    compromiso_fecha: compromisoFecha || undefined,
                    compromiso_cumplido: compromisoCumplido,
                    fecha_inicio_estimada: fechaInicioEstimada || undefined,
                    fecha_fin_estimada: fechaFinEstimada || undefined,
                    fecha_inicio_real: fechaInicioReal || undefined,
                    fecha_fin_real: fechaFinReal || undefined
                };
                const updated = await patch(API_ENDPOINTS.WBS_ACTIVITY_BY_ID(activityId), payload);
                if (!updated) throw new Error('No se pudo actualizar la tarea.');
                activityPersisted = true;
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
                    compromiso_fecha: compromisoFecha || undefined,
                    compromiso_cumplido: compromisoCumplido,
                    fecha_inicio_estimada: fechaInicioEstimada || undefined,
                    fecha_fin_estimada: fechaFinEstimada || undefined,
                    fecha_inicio_real: fechaInicioReal || undefined,
                    fecha_fin_real: fechaFinReal || undefined
                };
                const created = await post(API_ENDPOINTS.WBS_ACTIVITIES, payload);
                if (!created?.id) throw new Error('No se pudo obtener la tarea creada.');
                activityId = created.id;
                setPersistedActivityId(activityId);
                activityPersisted = true;
            }

            if (archivo && activityId) {
                const formData = new FormData();
                formData.append('archivo', archivo);
                const uploaded = await uploadEvidence(
                    API_ENDPOINTS.WBS_ACTIVITY_EVIDENCE(activityId),
                    formData
                );
                if (!uploaded) throw new Error('No se pudo guardar la evidencia.');
                setArchivoUrl(uploaded.archivo_url);
                setArchivo(null);
            }
            onSaved();
            onClose();
        } catch (error) {
            console.error('Error saving WBS node:', error);
            if (activityPersisted && archivo) {
                onSaved();
                setSaveError('La tarea se guardó, pero no fue posible adjuntar la evidencia. Puede reintentar sin crear otra tarea.');
            } else {
                setSaveError(error instanceof Error ? error.message : 'No se pudo guardar la tarea.');
            }
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            showCloseButton={false}
            closeOnOverlayClick={!loading}
            closeOnEscape={!loading}
            ariaLabel={editNode ? 'Editar tarea WBS' : 'Nueva tarea WBS'}
            className="!p-0 overflow-hidden rounded-3xl"
            contentClassName="!p-0 !overflow-hidden"
        >
            <div className="flex max-h-[90vh] flex-col">
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
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            icon={X}
                            disabled={loading}
                            aria-label="Cerrar modal"
                            className="!p-1.5 text-neutral-400 hover:text-neutral-500 rounded-full"
                        />
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
                                rows={3}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    type="date"
                                    label="Inicio Estimado"
                                    value={fechaInicioEstimada}
                                    onChange={(e) => setFechaInicioEstimada(e.target.value)}
                                />
                                <Input
                                    type="date"
                                    label="Fin Estimado"
                                    value={fechaFinEstimada}
                                    onChange={(e) => setFechaFinEstimada(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--color-border)]/50">
                                <Input
                                    type="date"
                                    label="Inicio Real"
                                    value={fechaInicioReal}
                                    onChange={(e) => setFechaInicioReal(e.target.value)}
                                />
                                <Input
                                    type="date"
                                    label="Fin Real"
                                    value={fechaFinReal}
                                    onChange={(e) => setFechaFinReal(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-5">
                                <Select
                                    label="Estado Actual"
                                    value={estado}
                                    onChange={(e) => setEstado(e.target.value as 'Pendiente' | 'En Proceso' | 'Pausa' | 'Completada')}
                                    options={[
                                        { value: 'Pendiente', label: 'Pendiente' },
                                        { value: 'En Proceso', label: 'En Proceso' },
                                        { value: 'Pausa', label: 'Pausa' },
                                        { value: 'Completada', label: 'Completada' },
                                    ]}
                                />
                                <div className="space-y-4">
                                    <Text variant="caption" weight="medium" color="text-secondary">Progreso: {avance}%</Text>
                                    <ProgressBar
                                        progress={avance}
                                        variant={avance === 100 ? 'success' : 'primary'}
                                        className="h-2"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-2 border-t border-[var(--color-border)]/50">
                                <AssignableUserSelect
                                    label="Supervisor"
                                    value={responsableId}
                                    onChange={setResponsableId}
                                    helperText="Persona que responde por la entrega."
                                />
                                <AssignableUserSelect
                                    label="Ejecutor"
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
                            <div className="grid grid-cols-2 gap-4 items-end">
                                <Input
                                    type="date"
                                    label="Fecha de Compromiso"
                                    value={compromisoFecha}
                                    onChange={(e) => setCompromisoFecha(e.target.value)}
                                />
                                <div className="flex items-center pb-2 h-10">
                                    <Checkbox
                                        label="Compromiso Cumplido"
                                        checked={compromisoCumplido}
                                        onChange={(e) => setCompromisoCumplido(e.target.checked)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Text variant="body2" weight="medium">Evidencia / Entregable</Text>
                                <FilePicker
                                    id="wbs-evidence-upload"
                                    files={archivo ? [archivo] : []}
                                    multiple={false}
                                    accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.docx,.xlsx,.pptx"
                                    placeholder="Seleccionar archivo o arrastrarlo aquí"
                                    onChange={(event) => setArchivo(event.target.files?.[0] || null)}
                                />
                                <Text variant="caption" color="text-secondary">
                                    PDF, imágenes, texto u Office sin macros. Máximo 25 MB.
                                </Text>
                                {archivoUrl && !archivo && (editNode?.id || persistedActivityId) && (
                                    <ActivityEvidenceButton
                                        actividadId={editNode?.id || persistedActivityId!}
                                        archivoUrl={archivoUrl}
                                        label="Ver evidencia actual"
                                    />
                                )}
                                {saveError && <Text variant="caption" color="error">{saveError}</Text>}
                            </div>
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
        </Modal>
    );
};
