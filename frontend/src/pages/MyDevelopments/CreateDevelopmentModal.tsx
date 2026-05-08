import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Title, Button, Input, Select, Textarea } from '../../components/atoms';

interface CreateDevelopmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    darkMode: boolean;
}

interface TipoDesarrollo {
    valor: string;
    etiqueta: string;
}

const DEFAULT_TIPO_OPTIONS = [
    { value: 'Proyecto', label: 'Proyecto' },
    { value: 'Mejora', label: 'Mejora' },
    { value: 'Soporte', label: 'Soporte' },
    { value: 'Renovación', label: 'Renovación' },
    { value: 'Actividad frecuente', label: 'Actividad frecuente' },
    { value: 'Actividad', label: 'Actividad' },
];

export const CreateDevelopmentModal: React.FC<CreateDevelopmentModalProps> = ({
    isOpen, onClose, onSaved, darkMode
}) => {
    const { get, post } = useApi<unknown>();
    const [loading, setLoading] = useState(false);
    const [tipoOptions, setTipoOptions] = useState(DEFAULT_TIPO_OPTIONS);

    // Form State
    const [id, setId] = useState(`DEV-${Math.floor(Date.now() / 1000).toString().slice(-5)}`);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [modulo, setModulo] = useState('');
    const [tipo, setTipo] = useState('Proyecto');
    const [autoridad, setAutoridad] = useState('');
    const [responsable, setResponsable] = useState('');
    const [areaDesarrollo, setAreaDesarrollo] = useState('');
    const [analista, setAnalista] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaEstimadaFin, setFechaEstimadaFin] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const loadTipos = async () => {
            try {
                const tipos = await get('/desarrollos/tipos');
                if (!Array.isArray(tipos)) return;

                const options = tipos
                    .filter((tipoItem): tipoItem is TipoDesarrollo => (
                        typeof tipoItem === 'object' &&
                        tipoItem !== null &&
                        'valor' in tipoItem &&
                        'etiqueta' in tipoItem &&
                        typeof tipoItem.valor === 'string' &&
                        typeof tipoItem.etiqueta === 'string'
                    ))
                    .map((tipoItem) => ({
                        value: tipoItem.valor,
                        label: tipoItem.etiqueta,
                    }));

                if (options.length > 0) {
                    setTipoOptions(options);
                    if (!options.some((option) => option.value === tipo)) {
                        setTipo(options[0].value);
                    }
                }
            } catch (error) {
                console.error('Error loading development types:', error);
            }
        };

        void loadTipos();
    }, [get, isOpen, tipo]);

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
                autoridad: autoridad || undefined,
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
            setAutoridad('');
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
            <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="p-6 border-b border-[var(--color-border)]">
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
                            options={tipoOptions}
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
                            label="Área de impacto"
                            placeholder="Ej. Gestión Humana"
                            value={areaDesarrollo}
                            onChange={(e) => setAreaDesarrollo(e.target.value)}
                        />
                        <Input
                            label="Líder de actividad"
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
                            label="Autoridad"
                            placeholder="Ej. Gerencia Administrativa"
                            value={autoridad}
                            onChange={(e) => setAutoridad(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Proceso"
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

                <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-surface-variant)] flex justify-end gap-3">
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
