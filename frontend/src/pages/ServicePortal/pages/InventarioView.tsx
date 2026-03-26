import React, { useState, useEffect } from 'react';
import { Title, Text, Button, Input } from '../../../components/atoms';
import { ArrowLeft, Loader2, Save, Info } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';

interface InventoryConfig {
    ronda_activa: number;
}

interface InventarioViewProps {
    onBack: () => void;
}

const InventarioView: React.FC<InventarioViewProps> = ({ onBack }) => {
    const [items, setItems] = useState<any[]>([]);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [ronda, setRonda] = useState(1);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [isConfigLoading, setIsConfigLoading] = useState(true);

    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    useEffect(() => {
        const init = async () => {
            await fetchConfig();
            await fetchAsignaciones();
        };
        init();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await axios.get<InventoryConfig>(`${API_CONFIG.BASE_URL}/inventario/config`, { headers });
            if (response.data) {
                setRonda(response.data.ronda_activa);
            }
        } catch (error) {
            console.error("Error fetching inventory config", error);
        } finally {
            setIsConfigLoading(false);
        }
    };

    const fetchAsignaciones = async () => {
        setIsLoadingItems(true);
        try {
            const response = await axios.get(`${API_CONFIG.BASE_URL}/inventario/mis-asignaciones`, { headers });
            setItems(response.data as any[]);
        } catch (error) {
            console.error("Error fetching asignaciones", error);
        } finally {
            setIsLoadingItems(false);
        }
    };

    const handleSaveItem = async (id: number, cantidad: number, observaciones: string) => {
        setSavingId(id);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/inventario/guardar-conteo`, {
                id, cantidad, observaciones, ronda
            }, { headers });
        } catch (error) {
            alert("Error al guardar el conteo");
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 py-4 animate-in fade-in duration-500">
            {/* Unified Header & Ronda Banner - Centered Sleek Version */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] py-2 px-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-start gap-6 lg:gap-12 relative overflow-hidden min-h-[72px]">
                <div className="flex flex-1 items-center gap-4 z-10 w-auto">
                    <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="rounded-xl shrink-0 !p-2" />
                    <div className="flex flex-col justify-center shrink-0">
                        <Title variant="h5" weight="bold" className="leading-tight">Inventario 2026</Title>
                        <Text variant="caption" color="text-secondary" className="uppercase tracking-widest font-bold text-[9px] leading-none mt-0.5">Digitalización de Conteo</Text>
                    </div>

                    {/* Ronda pill - al lado del título en móvil, extremo derecho en desktop */}
                    <div className="flex items-center justify-start gap-3 bg-neutral-50 dark:bg-neutral-800/50 p-1.5 px-[5px] rounded-2xl border border-[var(--color-border)] min-w-[100px] ml-auto">
                        <div className="text-right">
                            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-tighter block leading-none mb-0.5 text-[8px]">Ronda</Text>
                            <Text variant="caption" className="opacity-40 block leading-none italic text-[8px]">En Línea</Text>
                        </div>
                        <div className="w-[1px] h-5 bg-[var(--color-border)] mx-0.5"></div>
                        {isConfigLoading ? (
                            <Loader2 className="animate-spin text-primary-500" size={14} />
                        ) : (
                            <Text variant="h5" weight="bold" className="text-primary-600 dark:text-primary-400 leading-none flex flex-wrap !mx-0">C{ronda}</Text>
                        )}
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-3 text-right shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-primary-500/5 flex items-center justify-center text-primary-500">
                        <Info size={16} />
                    </div>
                    <div>
                        <Title variant="h6" weight="bold" className="text-xs leading-none mb-0.5">Toma Física Activa</Title>
                        <Text variant="caption" color="text-secondary" className="text-[10px] opacity-70 leading-tight block">Digitalizando según asignación.</Text>
                    </div>
                </div>
            </div>

            {/* Cards for Mobile - Hidden on Desktop */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {items.map((item) => (
                    <MobileItemCard
                        key={item.id}
                        item={item}
                        ronda={ronda}
                        onSave={handleSaveItem}
                        isSaving={savingId === item.id}
                    />
                ))}
                {items.length === 0 && !isLoadingItems && (
                    <div className="p-12 text-center bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] opacity-50">
                        <Text>No tienes productos asignados.</Text>
                    </div>
                )}
                {isLoadingItems && (
                    <div className="p-12 text-center">
                        <Loader2 className="animate-spin mx-auto text-primary-500" size={32} />
                    </div>
                )}
            </div>

            {/* Products Table - Hidden on Mobile */}
            <div className="hidden md:block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                        <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-[var(--color-border)]">
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">B. Siigo</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Bodega</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-center">Bloque</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-center">Estante</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-center">Nivel</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Código</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Descripción</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-center">Und.</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400 w-28 text-center bg-primary-500/5">Cant. C{ronda}</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400 min-w-[150px]">Observaciones</th>
                            <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {items.map((item) => (
                            <TableRow
                                key={item.id}
                                item={item}
                                ronda={ronda}
                                onSave={handleSaveItem}
                                isSaving={savingId === item.id}
                            />
                        ))}
                        {items.length === 0 && !isLoadingItems && (
                            <tr>
                                <td colSpan={11} className="p-12 text-center opacity-50 font-medium whitespace-pre-wrap">No tienes productos asignados para contar en esta área.{'\n'}Comunícate con el administrador para revisar tu asignación.</td>
                            </tr>
                        )}
                        {isLoadingItems && (
                            <tr>
                                <td colSpan={11} className="p-12 text-center">
                                    <Loader2 className="animate-spin mx-auto text-primary-500" size={32} />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TableRow = ({ item, ronda, onSave, isSaving }: any) => {
    const [val, setVal] = useState(item[`cant_c${ronda}`] || '');
    const [obs, setObs] = useState(item[`obs_c${ronda}`] || '');

    useEffect(() => {
        setVal(item[`cant_c${ronda}`] || '');
        setObs(item[`obs_c${ronda}`] || '');
    }, [ronda, item]);

    return (
        <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
            <td className="p-3">
                <Text variant="caption" weight="bold" className="text-neutral-500">{item.b_siigo}</Text>
            </td>
            <td className="p-3">
                <Text variant="body2" className="whitespace-nowrap">{item.bodega}</Text>
            </td>
            <td className="p-3 text-center">
                <Text variant="body2" weight="bold" className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md">{item.bloque}</Text>
            </td>
            <td className="p-3 text-center">
                <Text variant="body2" weight="bold">{item.estante}</Text>
            </td>
            <td className="p-3 text-center">
                <Text variant="body2" weight="bold" color="text-secondary">{item.nivel}</Text>
            </td>
            <td className="p-3">
                <Text variant="body2" weight="bold" className="text-primary-600 dark:text-primary-400 whitespace-nowrap">{item.codigo}</Text>
            </td>
            <td className="p-3">
                <Text variant="caption" className="line-clamp-2 max-w-[250px] leading-tight">{item.descripcion}</Text>
            </td>
            <td className="p-3 text-center">
                <Text variant="caption" weight="bold" className="opacity-60">{item.unidad}</Text>
            </td>
            <td className="p-3 bg-primary-500/5">
                <Input
                    type="text"
                    value={val}
                    onChange={(e) => {
                        const sanitized = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                        // Evitar múltiples puntos
                        const parts = sanitized.split('.');
                        if (parts.length > 2) return;
                        setVal(sanitized);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === ',') {
                            e.preventDefault();
                            const target = e.target as HTMLInputElement;
                            const start = target.selectionStart || 0;
                            const end = target.selectionEnd || 0;
                            const newValue = val.slice(0, start) + '.' + val.slice(end);
                            setVal(newValue);
                        }
                    }}
                    className="text-center font-bold text-base rounded-xl h-10 border-primary-500/20"
                    placeholder="0"
                />
            </td>
            <td className="p-3">
                <Input
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    placeholder="Notas..."
                    className="rounded-xl h-10 text-xs"
                />
            </td>
            <td className="p-3">
                <Button
                    variant="primary"
                    onClick={() => onSave(item.id, Number(val), obs)}
                    disabled={isSaving}
                    className="w-10 h-10 rounded-xl p-0 flex items-center justify-center shadow-md shadow-primary-500/10"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </Button>
            </td>
        </tr>
    );
};

const MobileItemCard = ({ item, ronda, onSave, isSaving }: any) => {
    const [val, setVal] = useState(item[`cant_c${ronda}`] || '');
    const [obs, setObs] = useState(item[`obs_c${ronda}`] || '');

    useEffect(() => {
        setVal(item[`cant_c${ronda}`] || '');
        setObs(item[`obs_c${ronda}`] || '');
    }, [ronda, item]);

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-5 space-y-4 shadow-sm active:scale-[0.98] transition-all">
            {/* Location Detail Header - Enhanced Visibility */}
            <div className="flex flex-wrap gap-1.5">
                <div className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center gap-1">
                    <Text variant="caption" weight="bold" className="text-[8px] uppercase opacity-50">B.SIIGO</Text>
                    <Text variant="caption" weight="bold" className="text-[10px] text-neutral-700 dark:text-neutral-300">{item.b_siigo}</Text>
                </div>
                <div className="bg-primary-500/10 px-2 py-1 rounded-lg border border-primary-500/20 flex items-center gap-1">
                    <Text variant="caption" weight="bold" className="text-[8px] uppercase text-primary-600/60">BOD</Text>
                    <Text variant="caption" weight="bold" className="text-[10px] text-primary-700 dark:text-primary-300">{item.bodega}</Text>
                </div>
                <div className="bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 flex items-center gap-1">
                    <Text variant="caption" weight="bold" className="text-[8px] uppercase text-blue-600/60">BLQ</Text>
                    <Text variant="caption" weight="bold" className="text-[10px] text-blue-700 dark:text-blue-300">{item.bloque}</Text>
                </div>
                <div className="bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1">
                    <Text variant="caption" weight="bold" className="text-[8px] uppercase text-amber-600/60">EST</Text>
                    <Text variant="caption" weight="bold" className="text-[10px] text-amber-700 dark:text-amber-300">{item.estante}</Text>
                </div>
                <div className="bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20 flex items-center gap-1">
                    <Text variant="caption" weight="bold" className="text-[8px] uppercase text-purple-600/60">NVL</Text>
                    <Text variant="caption" weight="bold" className="text-[10px] text-purple-700 dark:text-purple-300">{item.nivel}</Text>
                </div>
            </div>

            {/* Product Info - Side-by-Side Layout */}
            <div className="flex items-center gap-3">
                <Text variant="body1" weight="bold" className="text-primary-600 dark:text-primary-400 shrink-0 leading-none">
                    {item.codigo}
                </Text>
                <div className="w-[1px] h-4 bg-[var(--color-border)] opacity-50 shrink-0" />
                <Text variant="caption" className="line-clamp-1 leading-none opacity-80">
                    {item.descripcion}
                </Text>
            </div>

            <div className="w-full h-px bg-[var(--color-border)] opacity-50" />

            {/* Actions */}
            <div className="flex gap-3 items-end">
                <div className="flex-[4]">
                    <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest text-[8px] mb-1 block ml-1">Cant. C{ronda}</Text>
                    <Input
                        type="text"
                        inputMode="decimal"
                        value={val}
                        onChange={(e) => {
                            const sanitized = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                            const parts = sanitized.split('.');
                            if (parts.length > 2) return;
                            setVal(sanitized);
                        }}
                        className="text-center font-bold text-lg rounded-2xl h-12 border-primary-500/20"
                        placeholder="0"
                    />
                </div>
                <div className="flex-[5]">
                    <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest text-[8px] mb-1 block ml-1">Notas</Text>
                    <Input
                        value={obs}
                        onChange={(e) => setObs(e.target.value)}
                        placeholder="..."
                        className="rounded-2xl h-12 text-xs"
                    />
                </div>
                <div className="flex-[3]">
                    <Button
                        variant="primary"
                        onClick={() => onSave(item.id, Number(val), obs)}
                        disabled={isSaving}
                        className="w-full h-12 rounded-2xl shadow-lg shadow-primary-500/20"
                    >
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default InventarioView;
