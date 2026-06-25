import React, { useState, useEffect, useMemo } from 'react';
import { Title, Text, Button, Input, Badge, Select } from '../../../../../components/atoms';
import { Search, ShieldOff, X, User, CreditCard } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../../config/api';

interface Excepcion {
    id: number;
    cedula: string;
    nombre_asociado?: string;
    subcategoria: string;
    tipo: string;
    estado: string;
    valor_configurado: number;
    saldo_actual: number;
    observacion?: string;
}

interface RegistroContexto {
    id?: number;
    cedula: string;
    nombre_asociado?: string;
    concepto: string;
    valor: number;
    empresa: string;
}

interface ModalVincularExcepcionProps {
    visible: boolean;
    registro: RegistroContexto | null;
    mes?: number;
    anio?: number;
    subcategoria?: string;
    onClose: () => void;
    onVinculado: (registroId: number | string, excepcionId: number) => void;
}

const TIPO_LABELS: Record<string, string> = {
    SALDO_FAVOR: 'Saldo a Favor',
    PAGO_TERCERO: 'Pago Tercero',
    RETIRADO_AUTORIZADO: 'Retirado Autorizado',
    CONTRATISTAS: 'Contratistas',
    EXONERACION: 'Exoneración',
    PORCENTAJE_EMPRESA: '% Empresa',
};

const CURRENCY_FMT = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
});

const ModalVincularExcepcion: React.FC<ModalVincularExcepcionProps> = ({
    visible, registro, mes, anio, subcategoria, onClose, onVinculado
}) => {
    const [activeTab, setActiveTab] = useState<'existente' | 'nueva'>('existente');

    // Estado para "Vincular Existente"
    const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
    const [loading, setLoading] = useState(false);
    const [vinculando, setVinculando] = useState<number | null>(null);
    const [busqueda, setBusqueda] = useState('');

    // Estado para "Crear Nueva"
    const [nuevoTipo, setNuevoTipo] = useState('SALDO_FAVOR');
    const [nuevoValor, setNuevoValor] = useState<number | ''>('');
    const [nuevoPagador, setNuevoPagador] = useState('');
    const [nuevaObservacion, setNuevaObservacion] = useState('');
    const [creando, setCreando] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setBusqueda('');
        setActiveTab('existente');
        if (registro) {
            setNuevoValor(registro.valor);
        }
        const fetchExcepciones = async () => {
            setLoading(true);
            try {
                const res = await axios.get(
                    `${API_CONFIG.BASE_URL}/novedades-nomina/excepciones/`,
                    { params: { estado: 'ACTIVO' } }
                );
                setExcepciones(res.data);
            } catch {
                setExcepciones([]);
            } finally {
                setLoading(false);
            }
        };
        fetchExcepciones();
    }, [visible, registro]);

    // Ordenar: primero las que coincidan con la cédula del registro
    const excepcionesFiltradas = useMemo(() => {
        let lista = excepciones;
        if (busqueda.trim()) {
            const q = busqueda.toLowerCase();
            lista = lista.filter(e =>
                e.cedula.toLowerCase().includes(q) ||
                (e.nombre_asociado || '').toLowerCase().includes(q) ||
                e.subcategoria.toLowerCase().includes(q) ||
                e.tipo.toLowerCase().includes(q)
            );
        }
        // Priorizar misma cédula
        if (registro) {
            lista = [...lista].sort((a, b) => {
                const aMatch = a.cedula === registro.cedula ? 0 : 1;
                const bMatch = b.cedula === registro.cedula ? 0 : 1;
                return aMatch - bMatch;
            });
        }
        return lista;
    }, [excepciones, busqueda, registro]);

    const handleVincular = async (excepcionId: number) => {
        if (!registro) return;
        setVinculando(excepcionId);
        try {
            if (registro.id !== undefined) {
                // Vinculación por ID directo (Tabla Principal)
                await axios.post(
                    `${API_CONFIG.BASE_URL}/novedades-nomina/excepciones/registros/${registro.id}/vincular`,
                    null,
                    { params: { excepcion_id: excepcionId } }
                );
                onVinculado(registro.id, excepcionId);
            } else if (mes && anio && subcategoria) {
                // Vinculación dinámica (Tablas Preview Individuales)
                await axios.post(
                    `${API_CONFIG.BASE_URL}/novedades-nomina/excepciones/vincular-dinamico`,
                    {
                        cedula: registro.cedula,
                        concepto: registro.concepto,
                        subcategoria: subcategoria,
                        mes: mes,
                        anio: anio,
                        excepcion_id: excepcionId
                    }
                );
                // Usamos la cédula y concepto como identificador de UI
                onVinculado(`${registro.cedula}-${registro.concepto}`, excepcionId);
            } else {
                throw new Error("Faltan parámetros de contexto (mes, anio, subcategoria)");
            }
            onClose();
        } catch (err: any) {
            console.error('Error vinculando excepción:', err);
            const msg = err.response?.data?.detail || 'Error al vincular la excepción';
            alert(msg);
        } finally {
            setVinculando(null);
        }
    };

    const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setNuevoTipo(val);
        if (val === 'EXONERACION' || val === 'RETIRADO_AUTORIZADO' || val === 'CONTRATISTAS' || val === 'PAGO_TERCERO') {
            if (registro) setNuevoValor(registro.valor);
        }
    };

    const handleCrearYVincular = async () => {
        if (!registro) return;
        setCreando(true);
        try {
            // 1. Crear excepción
            const subcat = subcategoria || 'GENERAL';
            const payloadExcepcion = {
                cedula: registro.cedula,
                nombre_asociado: registro.nombre_asociado || '',
                subcategoria: subcat,
                tipo: nuevoTipo,
                valor_configurado: Number(nuevoValor),
                saldo_actual: Number(nuevoValor),
                estado: 'ACTIVO',
                pagador_cedula: nuevoTipo === 'PAGO_TERCERO' ? nuevoPagador : null,
                observacion: nuevaObservacion,
                creado_por: 'INLINE' // Marca especial para identificar excepciones creadas por línea
            };
            
            const resExc = await axios.post(`${API_CONFIG.BASE_URL}/novedades-nomina/excepciones/`, payloadExcepcion);
            const newExcepcionId = resExc.data.id;

            // 2. Vincular automáticamente
            await handleVincular(newExcepcionId);
        } catch (err: any) {
            console.error('Error creando excepción:', err);
            alert(err.response?.data?.detail || 'Error al crear la excepción');
            setCreando(false);
        }
    };

    if (!visible || !registro) return null;

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <Title variant="h5" weight="bold" className="flex items-center gap-2">
                            <ShieldOff className="w-5 h-5 text-amber-500" />
                            Excepciones de Nómina
                        </Title>
                        <Text size="sm" color="text-secondary" className="mt-1">
                            Gestiona la excepción para este registro
                        </Text>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Info del registro */}
                <div className="mx-5 mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <Text size="sm" weight="semibold">{registro.cedula}</Text>
                            <Text size="sm" color="text-secondary">- {registro.nombre_asociado || '---'}</Text>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <Text size="sm" color="text-secondary">{registro.concepto}</Text>
                        </div>
                        <Text size="sm" weight="bold" className="text-blue-600 ml-auto">
                            {CURRENCY_FMT.format(registro.valor)}
                        </Text>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 mx-5 mt-2">
                    <button
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'existente' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('existente')}
                    >
                        Vincular Existente
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'nueva' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('nueva')}
                    >
                        Crear Nueva Excepción
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'existente' && (
                        <div className="flex flex-col h-full">
                            {/* Buscador */}
                            <div className="px-5 pt-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        placeholder="Buscar por cédula, nombre, subcategoría o tipo..."
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {/* Lista de excepciones */}
                            <div className="px-5 py-3 space-y-2 pb-5">
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
                                    </div>
                                ) : excepcionesFiltradas.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Text color="text-secondary">No se encontraron excepciones activas</Text>
                                    </div>
                                ) : (
                                    excepcionesFiltradas.map(exc => {
                                        const esMismaCedula = registro && exc.cedula === registro.cedula;
                                        return (
                                            <div
                                                key={exc.id}
                                                className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md ${esMismaCedula
                                                    ? 'border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                    }`}
                                                onClick={() => handleVincular(exc.id)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <Text weight="semibold" size="sm">{exc.cedula}</Text>
                                                                <Text size="sm" color="text-secondary">{exc.nombre_asociado || ''}</Text>
                                                                {esMismaCedula && (
                                                                    <Badge variant="warning" size="sm">Coincide</Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="info" size="sm">{exc.subcategoria}</Badge>
                                                                <Text size="sm" color="text-secondary">
                                                                    {TIPO_LABELS[exc.tipo] || exc.tipo}
                                                                </Text>
                                                                {exc.observacion && (
                                                                    <Text size="sm" color="text-secondary" className="italic truncate max-w-[200px]">
                                                                        — {exc.observacion}
                                                                    </Text>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <Text size="sm" weight="bold" className="text-emerald-600">
                                                            {CURRENCY_FMT.format(exc.valor_configurado)}
                                                        </Text>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            className="mt-1"
                                                            disabled={vinculando === exc.id}
                                                            onClick={(e) => { e.stopPropagation(); handleVincular(exc.id); }}
                                                        >
                                                            {vinculando === exc.id ? 'Vinculando...' : 'Aplicar'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'nueva' && (
                        <div className="px-5 py-4 space-y-4 pb-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Select 
                                        label="Tipo de Excepción"
                                        value={nuevoTipo} 
                                        onChange={handleTipoChange}
                                        options={Object.entries(TIPO_LABELS).map(([val, label]) => ({ value: val, label }))}
                                    />
                                </div>
                                <div>
                                    <Input 
                                        label="Valor Configurado"
                                        type="number"
                                        value={nuevoValor}
                                        onChange={(e) => setNuevoValor(Number(e.target.value))}
                                        disabled={nuevoTipo === 'EXONERACION' || nuevoTipo === 'RETIRADO_AUTORIZADO' || nuevoTipo === 'CONTRATISTAS' || nuevoTipo === 'PAGO_TERCERO'}
                                    />
                                    {(nuevoTipo === 'EXONERACION' || nuevoTipo === 'RETIRADO_AUTORIZADO' || nuevoTipo === 'CONTRATISTAS' || nuevoTipo === 'PAGO_TERCERO') && (
                                        <Text size="xs" color="text-tertiary" className="mt-1 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            Aplica para la totalidad del valor.
                                        </Text>
                                    )}
                                </div>
                            </div>
                            
                            {nuevoTipo === 'PAGO_TERCERO' && (
                                <div>
                                    <Input 
                                        label="Cédula del Pagador"
                                        value={nuevoPagador} 
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNuevoPagador(e.target.value)} 
                                        placeholder="Ej. 10203040"
                                    />
                                    <Text size="xs" color="text-secondary" className="mt-1">
                                        El cobro se redirigirá a esta cédula automáticamente.
                                    </Text>
                                </div>
                            )}

                            <div>
                                <Input 
                                    label="Observación"
                                    value={nuevaObservacion} 
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNuevaObservacion(e.target.value)} 
                                    placeholder="Motivo o detalle de la excepción..."
                                />
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button variant="primary" disabled={creando} onClick={handleCrearYVincular} className="w-full sm:w-auto">
                                    {creando ? 'Creando y Vinculando...' : 'Crear y Vincular Excepción'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModalVincularExcepcion;
