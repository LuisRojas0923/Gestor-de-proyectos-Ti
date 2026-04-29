import React, { useState, useEffect, useMemo, useCallback, useTransition, useDeferredValue, useRef } from 'react';
import { Title, Text, Button, Badge, MultiSelect, Input } from '../../components/atoms';
import { Plus, Search, Filter, Edit2, Trash2, Info, Download } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import { herramientasService } from '../../services/herramientasService';
import { HerramientaInformatica } from '../../types/herramientas';
import Modal from '../../components/molecules/Modal';
import { useNotifications } from '../../components/notifications/NotificationsContext';
import HerramientaForm from './components/HerramientaForm';

// Estilos de grilla compartidos
const GRID_STYLE = "grid grid-cols-[180px_1fr_130px_130px_110px_90px_110px_120px] items-center gap-0 divide-x divide-neutral-100 dark:divide-neutral-800 w-full min-w-[1250px]";

// Componentes internos para estandarización visual
const GridCell: React.FC<{ children: React.ReactNode, className?: string, align?: 'start' | 'center' | 'end' }> = ({ children, className = "", align = 'start' }) => (
    <div className={`p-2 px-3 flex items-center h-full text-[11px] ${align === 'center' ? 'justify-center text-center' : align === 'end' ? 'justify-end text-right' : 'justify-start'} ${className}`}>
        {children}
    </div>
);

const MaestroHerramientas: React.FC = () => {
    const { addNotification } = useNotifications();
    const [herramientas, setHerramientas] = useState<HerramientaInformatica[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [, startTransition] = useTransition();
    const [search, setSearch] = useState('');
    const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHerramienta, setSelectedHerramienta] = useState<HerramientaInformatica | null>(null);
    const [tableHeight, setTableHeight] = useState(600);
    const tableRef = useRef<HTMLDivElement>(null);

    const deferredSearch = useDeferredValue(search);
    const deferredFilters = useDeferredValue(columnFilters);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await herramientasService.getAll();
            setHerramientas(data);
        } catch (error) {
            addNotification('error', 'Error al cargar herramientas');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        
        const updateHeight = () => {
            if (tableRef.current) {
                const rect = tableRef.current.getBoundingClientRect();
                const availableHeight = window.innerHeight - rect.top - 40;
                setTableHeight(Math.max(400, availableHeight));
            }
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    const filteredList = useMemo(() => {
        const activeCriteria = Object.entries(deferredFilters)
            .filter(([_, values]) => values.length > 0) as [string, string[]][];

        const searchLower = deferredSearch.toLowerCase();

        return herramientas.filter(item => {
            if (searchLower) {
                const searchStr = `${item.nombre} ${item.descripcion} ${item.responsable} ${item.departamento}`.toLowerCase();
                if (!searchStr.includes(searchLower)) return false;
            }

            return activeCriteria.every(([col, selectedValues]) => {
                const itemValue = String(item[col as keyof HerramientaInformatica] || '');
                return selectedValues.includes(itemValue);
            });
        });
    }, [herramientas, deferredFilters, deferredSearch]);

    const getOptionsForColumn = useCallback((col: keyof HerramientaInformatica) => {
        const unique = Array.from(new Set(herramientas.map(item => String(item[col] || ''))))
            .sort()
            .map(val => ({ value: val, label: val || '(Vacío)' }));
        return unique;
    }, [herramientas]);

    const handleEdit = (item: HerramientaInformatica) => {
        setSelectedHerramienta(item);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar esta herramienta?')) return;
        try {
            await herramientasService.delete(id);
            addNotification('success', 'Herramienta eliminada');
            fetchData();
        } catch (error) {
            addNotification('error', 'Error al eliminar');
        }
    };

    const handleExportExcel = async () => {
        try {
            await herramientasService.exportExcel();
            addNotification('success', 'Inventario exportado correctamente');
        } catch (error) {
            addNotification('error', 'Error al exportar el inventario');
        }
    };

    const InventoryRow = React.memo(({ item, style }: { item: HerramientaInformatica, style?: React.CSSProperties }) => (
        <div style={style} className={`${GRID_STYLE} group hover:bg-primary-500/[0.03] transition-all border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 relative`}>
            {/* Accent border on hover */}
            <div className="absolute left-0 top-0 w-1 h-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <GridCell className="font-semibold text-primary-900 dark:text-primary-300">{item.nombre}</GridCell>
            <GridCell className="text-[10px] opacity-70 line-clamp-2 leading-relaxed">{item.descripcion}</GridCell>
            <GridCell align="center" className="text-neutral-600 dark:text-neutral-400">{item.responsable}</GridCell>
            <GridCell align="center" className="text-neutral-600 dark:text-neutral-400">{item.departamento}</GridCell>
            <GridCell align="center">{item.ecosistema}</GridCell>
            <GridCell align="center">
                <Badge variant={item.estado === 'Activa' ? 'success' : 'default'} size="sm" className="shadow-sm">{item.estado}</Badge>
            </GridCell>
            <GridCell align="center" className="font-mono text-[9px] opacity-50">{item.ultima_actualizacion || '-'}</GridCell>
            <GridCell align="center" className="gap-1">
                <Button size="sm" variant="ghost" icon={Edit2} onClick={() => handleEdit(item)} className="!h-7 !w-7 !p-0 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-600" />
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => item.id && handleDelete(item.id)} className="!h-7 !w-7 !p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" />
            </GridCell>
        </div>
    ));

    const HeaderCell = ({ label, col, isFilterable = true }: { label: string, col?: keyof HerramientaInformatica, isFilterable?: boolean }) => {
        const hasActiveFilter = col ? (columnFilters[col as string]?.length > 0) : false;
        
        return (
            <div className="h-full relative flex items-center justify-center group overflow-hidden px-1">
                {isFilterable && col ? (
                    <MultiSelect
                        triggerLabel={label}
                        options={getOptionsForColumn(col)}
                        value={columnFilters[col as string] || []}
                        onChange={(v) => startTransition(() => setColumnFilters(prev => ({ ...prev, [col as string]: v })))}
                        minimal={true}
                        triggerClassName="text-white/60 group-hover:text-white transition-colors"
                        activeClassName="text-white font-bold underline decoration-primary-400 decoration-2 underline-offset-4"
                        className="w-full h-full !bg-transparent border-none overflow-hidden"
                    />
                ) : (
                    <Text weight="bold" className="text-[8.5px] uppercase text-white/60 px-2">{label}</Text>
                )}
                
                {hasActiveFilter && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-pulse" />
                )}
                
                {/* Separador visual interno */}
                <div className="absolute bottom-1 left-2 right-2 h-[1px] bg-white/5 group-hover:bg-white/10 transition-colors" />
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <Title variant="h2">Maestro de Herramientas Informáticas</Title>
                    <Text color="text-secondary">Inventario y control de software, Excels y procesos ETL.</Text>
                </div>
                <div className="flex gap-3">
                    <Button variant="ghost" icon={Download} onClick={handleExportExcel} className="border-neutral-200 dark:border-neutral-700">
                        Descargar Excel
                    </Button>
                    <Button variant="primary" icon={Plus} onClick={() => { setSelectedHerramienta(null); setIsModalOpen(true); }}>
                        Nueva Herramienta
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 items-center bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <Input placeholder="Buscar por nombre, descripción, responsable..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                </div>
                {Object.keys(columnFilters).length > 0 && (
                    <Button variant="ghost" icon={Filter} onClick={() => setColumnFilters({})} className="text-primary-500">
                        Limpiar Filtros ({Object.keys(columnFilters).length})
                    </Button>
                )}
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm shadow-navy/5">
                <div ref={tableRef} className="overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-200">
                    <div className="min-w-[1200px]">
                        <div className={`bg-navy text-white h-12 ${GRID_STYLE} sticky top-0 z-10 shadow-lg`}>
                            <HeaderCell label="NOMBRE" col="nombre" />
                            <HeaderCell label="DESCRIPCIÓN" isFilterable={false} />
                            <HeaderCell label="RESPONSABLE" col="responsable" />
                            <HeaderCell label="DEPARTAMENTO" col="departamento" />
                            <HeaderCell label="ECOSISTEMA" col="ecosistema" />
                            <HeaderCell label="ESTADO" col="estado" />
                            <HeaderCell label="ACTUALIZACIÓN" isFilterable={false} />
                            <HeaderCell label="ACCIONES" isFilterable={false} />
                        </div>
                        
                        <div 
                            ref={tableRef}
                            className="relative overflow-hidden"
                        >
                            {isLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center"><Text>Cargando...</Text></div>
                            ) : filteredList.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
                                    <Info size={48} className="mb-2" />
                                    <Text>No se encontraron herramientas</Text>
                                </div>
                            ) : (
                                <List height={tableHeight} itemCount={filteredList.length} itemSize={55} width="100%">
                                    {({ index, style }) => <InventoryRow item={filteredList[index]} style={style} />}
                                </List>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedHerramienta ? 'Editar Herramienta' : 'Nueva Herramienta'} size="lg">
                <HerramientaForm 
                    herramienta={selectedHerramienta} 
                    onCancel={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchData();
                    }}
                />
            </Modal>
        </div>
    );
};

export default MaestroHerramientas;
