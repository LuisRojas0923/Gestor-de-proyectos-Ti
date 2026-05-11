import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAppContext } from '../../context/AppContext';
import { HierarchyUser, HierarchyRelation } from '../../types/hierarchy';
import { Title, Button, Input, Select, Textarea, Text } from '../../components/atoms';

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

// ─── Autocomplete de jerarquía ───────────────────────────────────────────────
interface HierarchyAutocompleteProps {
    label: string;
    placeholder?: string;
    value: string;
    options: HierarchyUser[];
    onChange: (text: string) => void;
    onSelect: (user: HierarchyUser) => void;
}

const HierarchyAutocomplete: React.FC<HierarchyAutocompleteProps> = ({
    label, placeholder, value, options, onChange, onSelect,
}) => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);

    // Cuando se selecciona un usuario externamente (o se limpia), sincroniza el query
    const prevValue = useRef(value);
    if (prevValue.current !== value) {
        prevValue.current = value;
        if (query !== value) setQuery(value);
    }

    const term = query.trim().toLowerCase();
    const filtered = (
        term
            ? options.filter(u =>
                  u.nombre.toLowerCase().includes(term) ||
                  (u.cedula || '').includes(term)
              )
            : options
    ).slice(0, 8);

    return (
        <div className="w-full relative">
            <Text as="label" variant="body2" weight="medium" color="text-primary" className="block mb-1">
                {label}
            </Text>
            <Input
                placeholder={placeholder}
                value={query}
                autoComplete="off"
                onChange={(e) => {
                    const text = e.target.value;
                    setQuery(text);
                    onChange(text);
                    if (!text) onSelect({ id: '', nombre: '', rol: '', cedula: '' });
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl max-h-52 overflow-y-auto custom-scrollbar">
                    {filtered.map((user) => (
                        <Button
                            key={user.id}
                            variant="custom"
                            className="w-full px-4 py-2.5 text-left hover:bg-[var(--color-primary)]/10 transition-colors border-b border-[var(--color-border)] last:border-0"
                            onMouseDown={() => {
                                setQuery(user.nombre);
                                onSelect(user);
                                setOpen(false);
                            }}
                        >
                            <Text variant="body2" weight="semibold" color="text-primary">{user.nombre}</Text>
                            <Text as="span" variant="caption" color="text-secondary">
                                {[user.cedula, user.cargo || user.rol, user.area].filter(Boolean).join(' · ')}
                            </Text>
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

export const CreateDevelopmentModal: React.FC<CreateDevelopmentModalProps> = ({
    isOpen, onClose, onSaved, darkMode
}) => {
    const { get, post } = useApi<unknown>();
    const { state: appState } = useAppContext();
    const currentUserId = appState.user?.id ?? '';

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [tipoOptions, setTipoOptions] = useState(DEFAULT_TIPO_OPTIONS);

    // Form state
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [modulo, setModulo] = useState('');
    const [tipo, setTipo] = useState('Proyecto');
    const [autoridad, setAutoridad] = useState('');
    const [autoridadId, setAutoridadId] = useState('');
    const [responsable, setResponsable] = useState('');
    const [responsableId, setResponsableId] = useState('');
    const [areaDesarrollo, setAreaDesarrollo] = useState('');
    const [analista, setAnalista] = useState('');
    const [analistaId, setAnalistaId] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaEstimadaFin, setFechaEstimadaFin] = useState('');

    const totalSteps = 3;

    // Reset when closing
    const handleClose = () => {
        setStep(1);
        onClose();
    };

    // ─── Hierarchy Data ──────────────────────────────────────────────────────
    const [hierarchyUsers, setHierarchyUsers] = useState<HierarchyUser[]>([]);
    const [relations, setRelations] = useState<HierarchyRelation[]>([]);

    useEffect(() => {
        const fetchHierarchy = async () => {
            try {
                const [usersData, relData] = await Promise.all([
                    get('/jerarquia/usuarios-disponibles'),
                    get('/jerarquia/relaciones')
                ]);
                if (usersData) setHierarchyUsers(usersData as HierarchyUser[]);
                if (relData) {
                    const active = (relData as HierarchyRelation[]).filter(r => r.esta_activa);
                    setRelations(active);
                }
            } catch (err) {
                console.error('Error fetching hierarchy:', err);
            }
        };
        if (isOpen) fetchHierarchy();
    }, [isOpen]);

    // ── Derivaciones jerárquicas (Original Logic) ───────────────────────────
    const superiorId = useMemo(() =>
        relations.find(r => r.usuario_id === currentUserId)?.superior_id ?? '',
    [relations, currentUserId]);

    const superiorSuperiorId = useMemo(() =>
        superiorId ? (relations.find(r => r.usuario_id === superiorId)?.superior_id ?? '') : '',
    [relations, superiorId]);

    const subordinateIds = useMemo(() =>
        relations.filter(r => r.superior_id === currentUserId).map(r => r.usuario_id),
    [relations, currentUserId]);

    // Usuarios alcanzables desde la posición del usuario logueado (superiores + subordinados)
    const reachableUsers = useMemo<HierarchyUser[]>(() => {
        const inHierarchy = relations.some(
            r => r.usuario_id === currentUserId || r.superior_id === currentUserId
        );
        // Si no hay relaciones en el sistema, permitimos ver a todos (bootstrap)
        if (relations.length === 0) return hierarchyUsers;
        if (!currentUserId || !inHierarchy) return [];

        const ids = new Set<string>();
        ids.add(currentUserId);

        // Cadena de superiores hacia arriba
        let supId = superiorId;
        while (supId) {
            ids.add(supId);
            supId = relations.find(r => r.usuario_id === supId)?.superior_id ?? '';
        }

        // Subordinados de forma recursiva hacia abajo
        const addSubs = (uid: string) => {
            relations
                .filter(r => r.superior_id === uid)
                .forEach(r => { 
                    if (!ids.has(r.usuario_id)) {
                        ids.add(r.usuario_id); 
                        addSubs(r.usuario_id); 
                    }
                });
        };
        addSubs(currentUserId);

        return hierarchyUsers.filter(u => ids.has(u.id));
    }, [relations, hierarchyUsers, currentUserId, superiorId]);

    // Opciones de cada campo según el rol que se asignó el usuario logueado
    const analistaOptions = useMemo<HierarchyUser[]>(() => {
        if (currentUserId && responsableId === currentUserId) {
            return hierarchyUsers.filter(u => subordinateIds.includes(u.id));
        }
        if (currentUserId && autoridadId === currentUserId && responsableId) {
            const subOfResponsable = relations
                .filter(r => r.superior_id === responsableId)
                .map(r => r.usuario_id);
            return hierarchyUsers.filter(u => subOfResponsable.includes(u.id));
        }
        return reachableUsers;
    }, [responsableId, autoridadId, currentUserId, hierarchyUsers, relations, subordinateIds, reachableUsers]);

    const responsableOptions = useMemo<HierarchyUser[]>(() => {
        if (currentUserId && analistaId === currentUserId) {
            return superiorId ? hierarchyUsers.filter(u => u.id === superiorId) : [];
        }
        if (currentUserId && autoridadId === currentUserId) {
            return hierarchyUsers.filter(u => subordinateIds.includes(u.id));
        }
        return reachableUsers;
    }, [analistaId, autoridadId, currentUserId, hierarchyUsers, superiorId, subordinateIds, reachableUsers]);

    const autoridadOptions = useMemo<HierarchyUser[]>(() => {
        if (currentUserId && analistaId === currentUserId) {
            return superiorSuperiorId ? hierarchyUsers.filter(u => u.id === superiorSuperiorId) : [];
        }
        if (currentUserId && responsableId === currentUserId) {
            return superiorId ? hierarchyUsers.filter(u => u.id === superiorId) : [];
        }
        return reachableUsers;
    }, [analistaId, responsableId, currentUserId, hierarchyUsers, superiorId, superiorSuperiorId, reachableUsers]);
    // ─────────────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!nombre.trim()) return;
        setLoading(true);
        try {
            await post(`/desarrollos/`, {
                nombre,
                descripcion: descripcion || undefined,
                modulo: modulo || undefined,
                tipo,
                autoridad: autoridad || undefined,
                responsable: responsable || undefined,
                area_desarrollo: areaDesarrollo || undefined,
                analista: analista || undefined,
                fecha_inicio: fechaInicio || undefined,
                fecha_estimada_fin: fechaEstimadaFin || undefined,
                estado_general: 'Pendiente',
                porcentaje_progreso: 0.0,
            });
            onSaved();
            handleClose();
            // Clear form
            setNombre(''); setDescripcion(''); setModulo(''); setTipo('Proyecto');
            setAutoridad(''); setAutoridadId('');
            setResponsable(''); setResponsableId('');
            setAreaDesarrollo('');
            setAnalista(''); setAnalistaId('');
            setFechaInicio(''); setFechaEstimadaFin('');
        } catch (error) {
            console.error('Error creating development:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                        <div className="mb-6">
                            <Text variant="body1" weight="bold" color="text-primary">Paso 1: Información Básica</Text>
                            <Text variant="caption" color="text-secondary">Define de qué trata este nuevo desarrollo.</Text>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <Select
                                label="Tipo de Actividad"
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                                options={tipoOptions}
                            />
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
                                rows={4}
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                        <div className="mb-6">
                            <Text variant="body1" weight="bold" color="text-primary">Paso 2: Responsables e Impacto</Text>
                            <Text variant="caption" color="text-secondary">¿Quiénes intervienen y a qué área afecta?</Text>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <Input
                                label="Área de impacto"
                                placeholder="Ej. Gestión Humana"
                                value={areaDesarrollo}
                                onChange={(e) => setAreaDesarrollo(e.target.value)}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <HierarchyAutocomplete
                                    label="Responsable"
                                    placeholder="Buscar empleado..."
                                    value={responsable}
                                    options={responsableOptions}
                                    onChange={(text) => {
                                        setResponsable(text);
                                        if (!text) setResponsableId('');
                                        if (!text && autoridadId === currentUserId) {
                                            setAnalista(''); setAnalistaId('');
                                        }
                                    }}
                                    onSelect={(user) => {
                                        setResponsable(user.nombre);
                                        setResponsableId(user.id);
                                        if (autoridadId === currentUserId) {
                                            setAnalista(''); setAnalistaId('');
                                        }
                                    }}
                                />
                                <HierarchyAutocomplete
                                    label="Líder de actividad (Ejecutor)"
                                    placeholder="Buscar empleado..."
                                    value={analista}
                                    options={analistaOptions}
                                    onChange={(text) => {
                                        setAnalista(text);
                                        if (!text) setAnalistaId('');
                                    }}
                                    onSelect={(user) => {
                                        setAnalista(user.nombre);
                                        setAnalistaId(user.id);
                                    }}
                                />
                            </div>
                            <HierarchyAutocomplete
                                label="Autoridad"
                                placeholder="Buscar empleado..."
                                value={autoridad}
                                options={autoridadOptions}
                                onChange={(text) => {
                                    setAutoridad(text);
                                    if (!text) setAutoridadId('');
                                }}
                                onSelect={(user) => {
                                    setAutoridad(user.nombre);
                                    setAutoridadId(user.id);
                                }}
                            />
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                        <div className="mb-6">
                            <Text variant="body1" weight="bold" color="text-primary">Paso 3: Tiempos y Procesos</Text>
                            <Text variant="caption" color="text-secondary">Establece las fechas clave y el proceso relacionado.</Text>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <Input
                                label="Proceso relacionado"
                                placeholder="Ej. Logística o código del proyecto"
                                value={modulo}
                                onChange={(e) => setModulo(e.target.value)}
                            />
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
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)]">
                {/* Header */}
                <div className="p-6 border-b border-[var(--color-border)] bg-[var(--color-surface-variant)]/30">
                    <div className="flex justify-between items-center mb-4">
                        <Title variant="h5" weight="bold">Nuevo Proyecto</Title>
                        <Button variant="ghost" onClick={handleClose} icon={X} className="!p-1.5 text-neutral-400 hover:text-neutral-500" />
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex-1 flex flex-col gap-1.5">
                                <div className={`h-1.5 rounded-full transition-all duration-500 ${
                                    s <= step ? 'bg-[var(--color-primary)]' : 'bg-neutral-200 dark:bg-neutral-800'
                                }`} />
                                <Text variant="caption" weight={s === step ? 'bold' : 'normal'} color={s === step ? 'text-primary' : 'text-secondary'}>
                                    Paso {s}
                                </Text>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar min-h-[400px]">
                    {renderStep()}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-surface-variant)] flex justify-between items-center gap-3">
                    <Button 
                        variant="ghost" 
                        onClick={() => step > 1 ? setStep(step - 1) : handleClose()} 
                        disabled={loading}
                    >
                        {step === 1 ? 'Cancelar' : 'Anterior'}
                    </Button>
                    
                    <div className="flex gap-2">
                        {step < totalSteps ? (
                            <Button 
                                variant="primary" 
                                onClick={() => setStep(step + 1)}
                                disabled={step === 1 && !nombre.trim()}
                            >
                                Siguiente
                            </Button>
                        ) : (
                            <Button 
                                variant="primary" 
                                onClick={handleSave} 
                                disabled={loading || !nombre.trim()}
                            >
                                {loading ? 'Creando...' : 'Finalizar y Crear'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
