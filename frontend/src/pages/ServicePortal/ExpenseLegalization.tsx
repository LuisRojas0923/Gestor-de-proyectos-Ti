import React, { useState } from 'react';
import {
    Plus,
    Trash2,
    ArrowLeft,
    Wallet,
    User,
    IdCard,
    Network,
    MapPin,
    Save
} from 'lucide-react';
import {
    Button,
    Input,
    Select,
    Text,
    Title,
    MaterialCard,
    Spinner,
    CurrencyInput,
    Textarea
} from '../../components/atoms';
import axios from 'axios';
import { API_CONFIG } from '../../config/api';
import { useNotifications } from '../../components/notifications/NotificationsContext';

const API_BASE_URL = API_CONFIG.BASE_URL;

const generateId = () => {
    try {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
    } catch (e) {
        console.warn("randomUUID not available, using fallback");
    }
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

interface LineaGasto {
    id: string;
    categoria: string;
    fecha: string;
    ot: string;
    cc: string;
    scc: string;
    valorConFactura: number;
    valorSinFactura: number;
    observaciones: string;
    combinacionesCC: OTData[];
}

interface OTData {
    numero: string;
    cliente: string;
    centrocosto: string;
    subcentrocosto: string;
    especialidad?: string;
    ciudad?: string;
}

interface ExpenseLegalizationProps {
    user: any;
    onBack: () => void;
    onSuccess: () => void;
}

const ExpenseLegalization: React.FC<ExpenseLegalizationProps> = ({ user, onBack, onSuccess }) => {
    const [lineas, setLineas] = useState<LineaGasto[]>([
        {
            id: generateId(),
            categoria: '',
            fecha: new Date().toISOString().split('T')[0],
            ot: '',
            cc: '',
            scc: '',
            valorConFactura: 0,
            valorSinFactura: 0,
            observaciones: '',
            combinacionesCC: []
        }
    ]);
    const [observacionesGral, setObservacionesGral] = useState('');
    const [ots, setOts] = useState<OTData[]>([]);
    const [isSearchingOT, setIsSearchingOT] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { addNotification } = useNotifications();

    const addLinea = () => {
        setLineas([...lineas, {
            id: generateId(),
            categoria: '',
            fecha: new Date().toISOString().split('T')[0],
            ot: '',
            cc: '',
            scc: '',
            valorConFactura: 0,
            valorSinFactura: 0,
            observaciones: '',
            combinacionesCC: []
        }]);
    };

    const removeLinea = (id: string) => {
        if (lineas.length > 1) {
            setLineas(lineas.filter(l => l.id !== id));
        } else {
            addNotification('warning', 'Debe haber al menos una línea de gasto.');
        }
    };

    const updateLinea = (id: string, field: keyof LineaGasto, value: any) => {
        setLineas(lineas.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const handleOTSearch = async (query: string, lineaId: string) => {
        updateLinea(lineaId, 'ot', query);
        if (query.length < 2) {
            setOts([]);
            setIsSearchingOT(null);
            return;
        }

        setIsSearchingOT(lineaId);
        try {
            const res = await axios.get(`${API_BASE_URL}/viaticos/ots?query=${query}`);
            const data = res.data;
            setOts(data);
            if (data.length === 0) {
                addNotification('info', `No se encontró la OT "${query}" o el cliente similar.`);
                setIsSearchingOT(null);
            }
        } catch (err) {
            console.error("Error buscando OTs:", err);
            setOts([]);
            setIsSearchingOT(null);
        }
    };

    const selectOT = async (ot: OTData, lineaId: string) => {
        setIsSearchingOT(lineaId);
        try {
            const res = await axios.get(`${API_BASE_URL}/viaticos/ot/${ot.numero}/combinaciones`);
            const combinaciones: OTData[] = res.data;

            // Extraer CCs únicos y limpiar espacios
            const ccsUnicos = Array.from(new Set(combinaciones.map(c => c.centrocosto?.trim()).filter(Boolean)));
            const autoCC = ccsUnicos.length === 1 ? (ccsUnicos[0] || '') : '';

            // Si hay autoCC, buscar SCCs únicos para ese CC
            let autoSCC = '';
            if (autoCC) {
                const sccsDisp = combinaciones
                    .filter(c => c.centrocosto?.trim() === autoCC)
                    .map(c => c.subcentrocosto?.trim())
                    .filter(Boolean);

                if (sccsDisp.length === 1) {
                    autoSCC = sccsDisp[0] || '';
                }
            }

            setLineas(lineas.map(l => l.id === lineaId ? {
                ...l,
                ot: ot.numero,
                cc: autoCC,
                scc: autoSCC,
                combinacionesCC: combinaciones,
                // Si la OT seleccionada tiene info extra, se podría guardar. 
                // Pero como combinaciones trae la info completa, tomamos del primer elemento si existe
                // OJO: ot viene de la busqueda, combinaciones trae detalle.
            } : l));
        } catch (err) {
            console.error("Error cargando combinaciones de OT:", err);
            addNotification('error', 'No se pudieron cargar los centros de costo de la OT.');
        } finally {
            setOts([]);
            setIsSearchingOT(null);
        }
    };

    const totalFacturado = lineas.reduce((acc, l) => acc + Number(l.valorConFactura), 0);
    const totalSinFactura = lineas.reduce((acc, l) => acc + Number(l.valorSinFactura), 0);
    const totalGeneral = totalFacturado + totalSinFactura;

    const handleSubmit = async () => {
        const tieneLineasIncompletas = lineas.some(l =>
            !l.categoria ||
            !l.ot ||
            !l.cc ||
            !l.scc ||
            (Number(l.valorConFactura) === 0 && Number(l.valorSinFactura) === 0)
        );

        if (lineas.length === 0) {
            addNotification('error', 'Debe reportar al menos un gasto para enviar la legalización.');
            return;
        }

        if (tieneLineasIncompletas) {
            addNotification('error', 'Por favor complete todos los campos obligatorios en las líneas de gasto.');
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                empleado_cedula: user.cedula || user.id,
                empleado_nombre: user.name,
                area: user.area || 'N/A',
                cargo: user.cargo || 'N/A',
                ciudad: user.sede || 'N/A',
                observaciones_gral: observacionesGral,
                usuario_id: user.cedula || user.id,
                gastos: lineas.map(l => ({
                    categoria: l.categoria,
                    fecha: l.fecha,
                    ot: l.ot,
                    cc: l.cc,
                    scc: l.scc,
                    valorConFactura: Number(l.valorConFactura),
                    valorSinFactura: Number(l.valorSinFactura),
                    observaciones: l.observaciones
                }))
            };

            console.log("Payload enviado a backend:", payload);
            await axios.post(`${API_BASE_URL}/viaticos/enviar`, payload);
            addNotification('success', 'Reporte de gastos enviado correctamente a tránsito.');
            onSuccess();
        } catch (err: any) {
            console.error("Error enviando reporte:", err);
            addNotification('error', err.response?.data?.detail || 'Error al enviar el reporte.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-1 pb-28 max-w-[1300px] mx-auto">
            <div className="md:sticky top-16 z-40 bg-[var(--color-background)]/80 backdrop-blur-md py-1.5 flex items-center justify-between transition-all">
                <Button variant="ghost" onClick={onBack} size="sm" className="flex items-center gap-2">
                    <ArrowLeft size={18} />
                    <Text weight="medium" className="hidden sm:inline">Volver</Text>
                </Button>
                <Title variant="h5" weight="bold" color="text-primary" className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap md:text-xl">
                    Reporte de Gastos
                </Title>
                <div className="w-10 md:w-20"></div>
            </div>

            <MaterialCard className="!bg-[#002060] !text-white p-2 sm:p-3 md:p-4 rounded-2xl shadow-lg !border-none md:sticky top-[104px] z-30 mb-0.5 backdrop-blur-sm">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 md:gap-6 items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-800/40 p-2 rounded-lg text-white">
                            <User size={11} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <Text variant="caption" weight="semibold" color="white" className="text-[8px] sm:text-[14px] uppercase tracking-tight block opacity-70 truncate">Empleado</Text>
                            <Text variant="caption" className="text-[8px] sm:text-[14px] font-bold leading-tight truncate block" color="white" title={user.name}>{user.name}</Text>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-800/40 p-2 rounded-lg text-white">
                            <IdCard size={11} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <Text variant="caption" weight="semibold" color="white" className="text-[8px] sm:text-[14px] uppercase tracking-tight block opacity-70 truncate">Cargo</Text>
                            <Text variant="caption" className="text-[8px] sm:text-[14px] font-bold leading-tight truncate block" color="white" title={user.cargo}>{user.cargo}</Text>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-800/40 p-2 rounded-lg text-white">
                            <Network size={11} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <Text variant="caption" weight="semibold" color="white" className="text-[8px] sm:text-[14px] uppercase tracking-tight block opacity-70 truncate">Área</Text>
                            <Text variant="caption" className="text-[8px] sm:text-[14px] font-bold leading-tight truncate block" color="white" title={user.area}>{user.area}</Text>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-800/40 p-2 rounded-lg text-white">
                            <MapPin size={11} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <Text variant="caption" weight="semibold" color="white" className="text-[8px] sm:text-[14px] uppercase tracking-tight block opacity-70 truncate">Sede</Text>
                            <Text variant="caption" className="text-[8px] sm:text-[14px] font-bold leading-tight truncate block" color="white" title={user.sede}>{user.sede}</Text>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 col-span-2 md:col-span-1">
                        <div className="bg-blue-800/40 p-2.5 rounded-lg text-white">
                            <Wallet size={11} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <Text variant="caption" weight="semibold" color="white" className="text-[8px] sm:text-[14px] uppercase tracking-tight block opacity-70">Base Viáticos</Text>
                            <Text variant="caption" className="text-[9px] sm:text-[14px] font-black leading-tight" color="white">${(user.baseviaticos || 0).toLocaleString()}</Text>
                        </div>
                    </div>
                </div>
            </MaterialCard>

            <div className="space-y-1 md:space-y-2">
                <div className="md:sticky top-[180px] z-20 bg-[var(--color-background)]/80 backdrop-blur-md py-1 flex justify-between items-center px-1">
                    <Title variant="h6" weight="bold" className="text-slate-800">Detalle de Gastos</Title>
                    <Button
                        onClick={addLinea}
                        variant="erp"
                        size="sm"
                        className="px-4 h-9 rounded-xl text-[11px] font-bold shadow-sm"
                        icon={Plus}
                    >
                        Agregar Gasto
                    </Button>
                </div>

                <div className="space-y-4">
                    {lineas.map((linea, index) => (
                        <div key={linea.id} className={`bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all group/line relative ${isSearchingOT === linea.id ? 'z-[100]' : 'z-10'}`}>
                            <div className="p-4 sm:p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[40px_2fr_1.5fr_1.5fr_1.2fr_1.2fr_1.5fr_1.5fr_2fr_50px] gap-4 items-end">

                                    {/* # No. */}
                                    <div className="hidden lg:block">
                                        <div className="h-10 flex flex-col items-center justify-center bg-[var(--color-primary)]/5 rounded-xl border border-[var(--color-primary)]/10">
                                            {/*<Text variant="caption" weight="bold" className="text-[10px] text-[var(--color-primary)] opacity-50 leading-none mb-1">N°</Text>*/}
                                            <Text weight="bold" className="text-sm text-[var(--color-primary)] font-mono leading-none">{index + 1}</Text>
                                        </div>
                                    </div>

                                    {/* Categoría */}
                                    <div>
                                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">Categoría</Text>
                                        <Select
                                            value={linea.categoria}
                                            onChange={(e) => updateLinea(linea.id, 'categoria', e.target.value)}
                                            className="w-full"
                                            size="sm"
                                            options={[
                                                { value: "", label: "Seleccionar..." },
                                                { value: "Alimentación", label: "Alimentación" },
                                                { value: "Hospedaje", label: "Hospedaje" },
                                                { value: "Transporte Municipal", label: "Transporte Mun." },
                                                { value: "Transporte Intermunicipal", label: "Transporte Inter." },
                                                { value: "Peajes", label: "Peajes" },
                                                { value: "Combustible", label: "Combustible" },
                                                { value: "Papeleria", label: "Papelería" },
                                                { value: "Imprevistos", label: "Imprevistos" }
                                            ]}
                                        />
                                    </div>

                                    {/* Fecha */}
                                    <div>
                                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">Fecha</Text>
                                        <Input
                                            type="date"
                                            value={linea.fecha}
                                            onChange={(e) => updateLinea(linea.id, 'fecha', e.target.value)}
                                            className="w-full"
                                            size="sm"
                                        />
                                    </div>

                                    {/* OT / OS */}
                                    <div>
                                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">OT / OS</Text>
                                        <div className="relative">
                                            <Input
                                                placeholder="Buscar..."
                                                value={linea.ot}
                                                onChange={(e) => handleOTSearch(e.target.value, linea.id)}
                                                className="w-full"
                                                size="sm"
                                            />
                                            {isSearchingOT === linea.id && ots.length > 0 && (
                                                <div className="absolute top-full left-0 w-full sm:w-[320px] bg-[var(--color-surface)] backdrop-blur-md border border-[var(--color-border)] rounded-2xl shadow-2xl z-[100] max-h-60 overflow-y-auto mt-2 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {ots.map((ot) => (
                                                        <div
                                                            key={ot.numero}
                                                            className="px-4 py-3 hover:bg-[var(--color-primary)]/10 cursor-pointer border-b border-[var(--color-border)]/50 last:border-none transition-colors group"
                                                            onClick={() => selectOT(ot, linea.id)}
                                                        >
                                                            <div className="flex items-center justify-between mb-0.5">
                                                                <Text weight="bold" className="text-xs text-[var(--color-text-primary)]">{ot.numero}</Text>
                                                                <Text weight="bold" className="text-[9px] text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">SELECCIONAR</Text>
                                                            </div>
                                                            <Text variant="caption" className="text-[10px] text-[var(--color-text-secondary)] opacity-70 block truncate uppercase tracking-tight">{ot.cliente}</Text>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* C. Costo */}
                                    <div>
                                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">C. Costo</Text>
                                        <Select
                                            value={linea.cc}
                                            disabled={!linea.ot || linea.combinacionesCC.length === 0}
                                            onChange={(e) => {
                                                const newCC = e.target.value;
                                                const sccsDisp = linea.combinacionesCC
                                                    .filter(c => c.centrocosto?.trim() === newCC)
                                                    .map(c => c.subcentrocosto?.trim())
                                                    .filter(Boolean);
                                                const newSCC = sccsDisp.length === 1 ? (sccsDisp[0] || '') : '';
                                                setLineas(prevLineas => prevLineas.map(l =>
                                                    l.id === linea.id
                                                        ? { ...l, cc: newCC, scc: newSCC }
                                                        : l
                                                ));
                                            }}
                                            className="w-full"
                                            size="sm"
                                            options={[
                                                { value: "", label: "..." },
                                                ...Array.from(new Set(linea.combinacionesCC.map(c => c.centrocosto?.trim()).filter(Boolean))).map(cc => ({
                                                    value: cc || '',
                                                    label: cc || ''
                                                }))
                                            ]}
                                        />
                                    </div>

                                    {/* Subcentro */}
                                    <div>
                                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">Subcentro</Text>
                                        <Select
                                            value={linea.scc}
                                            disabled={!linea.cc}
                                            onChange={(e) => updateLinea(linea.id, 'scc', e.target.value)}
                                            className="w-full"
                                            size="sm"
                                            options={[
                                                { value: "", label: "..." },
                                                ...(linea.combinacionesCC
                                                    .filter(c => c.centrocosto?.trim() === linea.cc)
                                                    .map(c => c.subcentrocosto?.trim())
                                                    .filter(Boolean)
                                                    .map(scc => ({
                                                        value: scc || '',
                                                        label: scc || ''
                                                    }))
                                                )
                                            ]}
                                        />
                                    </div>

                                    {/* Factura */}
                                    <div>
                                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">Val. Factura</Text>
                                        <CurrencyInput
                                            value={linea.valorConFactura.toString()}
                                            onChange={(val) => updateLinea(linea.id, 'valorConFactura', val)}
                                            className="!text-[12px] !h-10 text-right font-bold bg-[var(--color-primary)]/5"
                                            size="sm"
                                        />
                                    </div>

                                    {/* Sin Factura */}
                                    <div>
                                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">Val. Sin Fac.</Text>
                                        <CurrencyInput
                                            value={linea.valorSinFactura.toString()}
                                            onChange={(val) => updateLinea(linea.id, 'valorSinFactura', val)}
                                            className="!text-[12px] !h-10 text-right font-bold bg-[var(--color-primary)]/5"
                                            size="sm"
                                        />
                                    </div>

                                    {/* Observaciones */}
                                    <div>
                                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">Observaciones</Text>
                                        <Input
                                            placeholder="Motivo..."
                                            value={linea.observaciones}
                                            onChange={(e) => updateLinea(linea.id, 'observaciones', e.target.value)}
                                            className="w-full"
                                            size="sm"
                                        />
                                    </div>

                                    {/* Botón Eliminar */}
                                    <div className="flex justify-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeLinea(linea.id)}
                                            className="text-[var(--color-text-secondary)] opacity-20 hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all rounded-xl !p-2 h-10 w-10 flex items-center justify-center"
                                            icon={Trash2}
                                        />
                                    </div>

                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-6 max-w-[1300px] mx-auto mt-6 px-1">
                <div className="space-y-2">
                    <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 uppercase tracking-tight block px-1">Observaciones Generales</Text>
                    <Textarea
                        placeholder="Escribe aquí cualquier observación sobre este reporte..."
                        value={observacionesGral}
                        onChange={(e) => setObservacionesGral(e.target.value)}
                        rows={4}
                        className="w-full bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                    />
                </div>

                {/* Resumen Final Premium */}
                <section className="bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-2xl p-3 shadow-xl mt-4 border border-[var(--color-border)] backdrop-blur-sm">
                    <div className="grid md:grid-cols-2 gap-4 items-center max-w-3xl mx-auto">
                        <div className="grid grid-cols-2 gap-20 text-[var(--color-text-secondary)]">
                            <div className="flex flex-col flex-1 bg-[var(--color-primary)]/5 p-2 rounded-xl border border-[var(--color-primary)]/10">
                                <Text variant="caption" weight="bold" className="text-[10px] uppercase tracking-wider mb-0.5 opacity-70">Total Con Facturado</Text>
                                <Text className="font-mono text-[var(--color-text-primary)] text-base font-bold">${totalFacturado.toLocaleString()}</Text>
                            </div>
                            <div className="flex flex-col flex-1 bg-[var(--color-primary)]/5 p-2 rounded-xl border border-[var(--color-primary)]/10">
                                <Text variant="caption" weight="bold" className="text-[10px] uppercase tracking-wider mb-0.5 opacity-70">Total Sin Factura</Text>
                                <Text className="font-mono text-[var(--color-text-primary)] text-base font-bold">${totalSinFactura.toLocaleString()}</Text>
                            </div>
                        </div>

                        <div className="text-center md:border-l border-[var(--color-border)] md:pl-6 py-1">
                            <Text variant="caption" weight="bold" className="text-[9px] text-[var(--color-primary)] uppercase tracking-[0.2em] mb-1">Gran Total Reportado</Text>
                            <Text className="text-4xl font-black text-[var(--color-text-primary)] drop-shadow-md leading-none">
                                ${totalGeneral.toLocaleString()}
                            </Text>
                        </div>
                    </div>
                </section>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-[var(--color-surface)]/80 backdrop-blur-xl border-t border-[var(--color-border)] p-4 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                <div className="max-w-[1300px] mx-auto flex items-center justify-center">
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        variant="erp"
                        className="px-20 h-14 rounded-2xl flex items-center gap-3 shadow-xl font-bold text-lg active:scale-95 transition-all"
                    >
                        {isLoading ? <Spinner size="sm" /> : <Save size={24} />}
                        {isLoading ? 'Procesando...' : 'Enviar Reporte'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExpenseLegalization;
