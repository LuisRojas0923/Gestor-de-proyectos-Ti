import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Title, Button, Input, Select, Textarea } from '../../components/atoms';

interface CreateDevelopmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    darkMode: boolean;
}

export const CreateDevelopmentModal: React.FC<CreateDevelopmentModalProps> = ({
    isOpen, onClose, onSaved, darkMode
}) => {
    const { post } = useApi();
    const [loading, setLoading] = useState(false);

    // Form State
    const [id, setId] = useState(`DEV-${Math.floor(Date.now() / 1000).toString().slice(-5)}`);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [modulo, setModulo] = useState('');
    const [tipo, setTipo] = useState('Proyecto');
    const [responsable, setResponsable] = useState('');
    const [areaDesarrollo, setAreaDesarrollo] = useState('');
    const [analista, setAnalista] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaEstimadaFin, setFechaEstimadaFin] = useState('');

    const handleSave = async () => {
        if (!nombre.trim() || !id.trim()) return;
        setLoading(true);

        try {
            const payload = {
                id,
                nombre,
                descripcion: descripcion || undefined,
                modulo: modulo || id,
                tipo,
                responsable: responsable || undefined,
                area_desarrollo: areaDesarrollo || undefined,
                analista: analista || undefined,
                fecha_inicio: fechaInicio || undefined,
                fecha_estimada_fin: fechaEstimadaFin || undefined,
                estado_general: "Pendiente",
                porcentaje_progreso: 0.0
            };

            // Using the developments base api endpoint
            await post(`/desarrollos/`, payload);
            
            onSaved();
            onClose();
            // Reset state
            setId(`DEV-${Math.floor(Date.now() / 1000).toString().slice(-5)}`);
            setNombre('');
            setDescripcion('');
            setModulo('');
            setTipo('Proyecto');
            setResponsable('');
            setAreaDesarrollo('');
            setAnalista('');
            setFechaInicio('');
            setFechaEstimadaFin('');
        } catch (error) {
            console.error('Error creating development:', error);
            // Ideally trigger a notification here
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col ${darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white'}`}>
                <div className={`p-6 border-b ${darkMode ? 'border-neutral-700' : ' border-neutral-100'}`}>
                    <div className="flex justify-between items-center">
                        <Title variant="h5" weight="bold">Nuevo Proyecto</Title>
                        <Button variant="ghost" onClick={onClose} icon={X} className="!p-1.5 text-neutral-400 hover:text-neutral-500" />
                    </div>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="ID / Código"
                            placeholder="Ej. DEV-1024"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            required
                        />
                        <Select
                            label="Tipo"
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            options={[
                                { value: 'Proyecto', label: 'Proyecto' },
                                { value: 'Mejora', label: 'Mejora' },
                                { value: 'Soporte', label: 'Soporte' },
                                { value: 'Renovación', label: 'Renovación' },
                            ]}
                        />
                    </div>

                    <Input
                        label="Nombre del Proyecto"
                        placeholder="Ej. Integración pasarela de pagos"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                    />

                    <Textarea
                        label="Descripción"
                        placeholder="Detalles sobre el propósito del desarrollo..."
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Área de Desarrollo"
                            placeholder="Ej. Gestión Humana"
                            value={areaDesarrollo}
                            onChange={(e) => setAreaDesarrollo(e.target.value)}
                        />
                        <Input
                            label="Ejecutor / Asignado"
                            placeholder="Ej. LUIS ENRIQUE"
                            value={analista}
                            onChange={(e) => setAnalista(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Responsable"
                            placeholder="Nombre del responsable..."
                            value={responsable}
                            onChange={(e) => setResponsable(e.target.value)}
                        />
                        <Input
                            label="Módulo"
                            placeholder="Ej. Logística o código del proyecto"
                            value={modulo}
                            onChange={(e) => setModulo(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Fecha de Inicio"
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                        />
                        <Input
                            label="Fecha Estimada de Fin"
                            type="date"
                            value={fechaEstimadaFin}
                            onChange={(e) => setFechaEstimadaFin(e.target.value)}
                        />
                    </div>
                </div>

                <div className={`p-6 border-t ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-100'} flex justify-end gap-3`}>
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={loading || !nombre.trim() || !id.trim()}>
                        {loading ? 'Creando...' : 'Crear Proyecto'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
