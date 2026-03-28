import React from 'react';
import { Title, Text, Button, Input, Select, Badge, ProgressBar, MultiSelect } from '../../../components/atoms';
import { UserPlus, UserMinus, Trash2, Search, Loader2, Pencil } from 'lucide-react';

interface AsignacionSeccionProps {
    coverage: any;
    newAsig: any;
    setNewAsig: (f: any) => void;
    isSearchingEmpleado: boolean;
    isSavingAsig: boolean;
    asignaciones: any[];
    handleSaveAsig: () => void;
    handleDeleteAsig: (id: number) => void;
    handleEditAsig: (asig: any) => void;
    cancelEdit: () => void;
    editingAsigId: number | null;
    getBodegaOptions: () => any[];
    getBloqueOptions: (bodega: string) => any[];
    getEstanteOptions: (bodega: string, bloque: string) => any[];
    getNivelOptions: (bodega: string, bloque: string, estante: string) => any[];
    inventoryList: any[];
}

const AsignacionSeccion: React.FC<AsignacionSeccionProps> = ({
    coverage,
    newAsig,
    setNewAsig,
    isSearchingEmpleado,
    isSavingAsig,
    asignaciones,
    handleSaveAsig,
    handleDeleteAsig,
    handleEditAsig,
    cancelEdit,
    editingAsigId,
    getBodegaOptions,
    getBloqueOptions,
    getEstanteOptions,
    getNivelOptions,
    inventoryList
}) => {
    const isEditMode = editingAsigId !== null;

    // Función para calcular cuántos items pertenecen a esta asignación (v4.3)
    const getAssignmentCount = (asig: any) => {
        if (!inventoryList || inventoryList.length === 0) return 0;
        const estanteList = asig.estante ? asig.estante.split(',').map((s: string) => s.trim()) : [];

        return inventoryList.filter(i =>
            i.bodega === asig.bodega &&
            (!asig.bloque || i.bloque === asig.bloque) &&
            (estanteList.length === 0 || estanteList.includes(i.estante)) &&
            (!asig.nivel || i.nivel === asig.nivel)
        ).length;
    };

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Title variant="h6" weight="bold">Asignación de Personal</Title>
                    <Text variant="caption" color="text-secondary">Configura las cuadrillas de operarios por ubicación jerárquica.</Text>
                </div>
                <Badge variant="info" size="sm" className="font-bold">{asignaciones.length} Asignaciones Activas</Badge>
            </div>

            {/* Monitor de Cobertura */}
            <div className={`p-4 rounded-3xl border flex flex-col md:flex-row items-center gap-6 mb-4 transition-all duration-500 ${coverage.cobertura === 100 ? 'bg-green-500/5 border-green-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${coverage.cobertura === 100 ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                            <Text variant="caption" weight="bold" className="uppercase tracking-[0.2em] text-[10px]">Cobertura de Asignaciones</Text>
                        </div>
                        <Text variant="body2" weight="bold" className={coverage.cobertura === 100 ? 'text-green-600' : 'text-amber-600'}>{coverage.cobertura}%</Text>
                    </div>
                    <ProgressBar
                        progress={coverage.cobertura}
                        variant={coverage.cobertura === 100 ? 'success' : 'warning'}
                        className="h-2"
                    />
                </div>
                <div className="flex shrink-0 items-center gap-4 border-l border-neutral-200 dark:border-neutral-700 pl-6 h-12">
                    <div className="text-center">
                        <Text variant="body2" weight="bold" className="block text-xl leading-none">{coverage.total_ubicaciones_pendientes}</Text>
                        <Text variant="caption" color="text-secondary" className="text-[9px] uppercase font-bold opacity-60">Zonas Totales</Text>
                    </div>
                    <div className="text-center">
                        <Text variant="body2" weight="bold" className={`block text-xl leading-none ${coverage.faltantes.length > 0 ? 'text-red-500' : 'text-green-500'}`}>{coverage.total_ubicaciones_pendientes - coverage.cubiertos}</Text>
                        <Text variant="caption" color="text-secondary" className="text-[9px] uppercase font-bold opacity-60">Sin Asignar</Text>
                    </div>
                </div>
            </div>

            {/* Desglose por Bodega (v4.2) */}
            {coverage.desglose_bodega && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                    {Object.entries(coverage.desglose_bodega).map(([name, data]: [string, any]) => (
                        <div key={name} className="bg-neutral-50 dark:bg-neutral-800/30 p-2 px-3 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                            <Text variant="caption" weight="bold" className="text-[9px] uppercase text-neutral-400 block mb-1">Bodega {name}</Text>
                            <div className="flex items-center justify-between">
                                <Text variant="body2" weight="bold" className="text-xs">{data.porcentaje}%</Text>
                                <Text variant="caption" className="text-[8px] opacity-40">{data.cubiertos}/{data.total}</Text>
                            </div>
                            <ProgressBar progress={data.porcentaje} variant={data.porcentaje === 100 ? 'success' : 'primary'} className="h-1 mt-1" />
                        </div>
                    ))}
                </div>
            )}

            {/* Formulario de Asignación Rediseñado (v4.3) */}
            <div className="bg-neutral-50/50 dark:bg-neutral-800/30 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-inner overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-neutral-700">

                    {/* Grupo A: Información de la Cuadrilla */}
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-primary-50 dark:bg-primary-500/10 rounded-lg">
                                <Search size={14} className="text-primary-500" />
                            </div>
                            <Text variant="caption" weight="bold" className="uppercase tracking-widest text-neutral-400">Composición de Cuadrilla</Text>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {/* Operario 1 */}
                            <div className="md:col-span-4 space-y-1.5">
                                <Text variant="caption" weight="bold" color="text-secondary" className="text-[9px] uppercase tracking-wider ml-1">Cédula Titular</Text>
                                <div className="relative">
                                    <Input
                                        value={newAsig.cedula}
                                        onChange={(e) => setNewAsig((prev: any) => ({ ...prev, cedula: e.target.value }))}
                                        placeholder="Cédula"
                                        className="rounded-xl h-10 text-xs pr-9 !bg-white dark:!bg-neutral-800 border-neutral-200"
                                        disabled={isSearchingEmpleado}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {isSearchingEmpleado ? <Loader2 size={12} className="animate-spin text-primary-500" /> : <Search size={14} className="text-neutral-300" />}
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-8 space-y-1.5">
                                <Text variant="caption" weight="bold" color="text-secondary" className="text-[9px] uppercase tracking-wider ml-1">Nombre Completo</Text>
                                <Input
                                    value={newAsig.nombre}
                                    onChange={(e) => setNewAsig((prev: any) => ({ ...prev, nombre: e.target.value }))}
                                    placeholder="Nombre cargado del ERP..."
                                    className="rounded-xl h-10 text-xs disabled:opacity-80 !bg-white dark:!bg-neutral-800 border-neutral-200"
                                    disabled={true}
                                />
                            </div>

                            {/* Operario 2 */}
                            <div className="md:col-span-4 space-y-1.5">
                                <Text variant="caption" weight="bold" color="text-secondary" className="text-[9px] uppercase tracking-wider ml-1">Cédula Compañero</Text>
                                <div className="relative">
                                    <Input
                                        value={newAsig.cedula_companero || ''}
                                        onChange={(e) => setNewAsig((prev: any) => ({ ...prev, cedula_companero: e.target.value }))}
                                        placeholder="Opcional"
                                        className="rounded-xl h-10 text-xs pr-9 !bg-white dark:!bg-neutral-800 border-neutral-200"
                                        disabled={isSearchingEmpleado}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {isSearchingEmpleado ? <Loader2 size={12} className="animate-spin text-primary-500" /> : <Search size={14} className="text-neutral-300" />}
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-8 space-y-1.5">
                                <Text variant="caption" weight="bold" color="text-secondary" className="text-[9px] uppercase tracking-wider ml-1">Nombre Compañero</Text>
                                <Input
                                    value={newAsig.nombre_companero || ''}
                                    onChange={(e) => setNewAsig((prev: any) => ({ ...prev, nombre_companero: e.target.value }))}
                                    placeholder="Nombre cargado del ERP..."
                                    className="rounded-xl h-10 text-xs disabled:opacity-80 !bg-white dark:!bg-neutral-800 border-neutral-200"
                                    disabled={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Grupo B: Zona de Destino */}
                    <div className="p-6 space-y-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                                    <UserPlus size={14} className="text-amber-500" />
                                </div>
                                <Text variant="caption" weight="bold" className="uppercase tracking-widest text-neutral-400">Ubicación Asignada</Text>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Select
                                    label="Bodega"
                                    options={getBodegaOptions()}
                                    value={newAsig.bodega}
                                    onChange={(e) => setNewAsig((prev: any) => ({ ...prev, bodega: e.target.value, bloque: '', estante: '', nivel: '' }))}
                                    size="sm"
                                    disabled={isSavingAsig}
                                />
                                <Select
                                    label="Bloque"
                                    options={getBloqueOptions(newAsig.bodega)}
                                    value={newAsig.bloque}
                                    onChange={(e) => setNewAsig((prev: any) => ({ ...prev, bloque: e.target.value, estante: '', nivel: '' }))}
                                    size="sm"
                                    disabled={!newAsig.bodega}
                                />
                                <MultiSelect
                                    label="Estantes"
                                    placeholder="Varios..."
                                    options={(getEstanteOptions(newAsig.bodega, newAsig.bloque) || []).filter(o => o.value !== '')}
                                    value={newAsig.estante ? newAsig.estante.split(',').map((s: string) => s.trim()) : []}
                                    onChange={(vals) => setNewAsig((prev: any) => ({ ...prev, estante: vals.join(','), nivel: '' }))}
                                    disabled={!newAsig.bloque}
                                />
                                <Select
                                    label="Nivel (Opcional)"
                                    options={getNivelOptions(newAsig.bodega, newAsig.bloque, newAsig.estante)}
                                    value={newAsig.nivel}
                                    onChange={(e) => setNewAsig((prev: any) => ({ ...prev, nivel: e.target.value }))}
                                    size="sm"
                                    disabled={!newAsig.estante}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex items-center gap-3 border-t border-neutral-200 dark:border-neutral-700/50">
                            <Button
                                variant={isEditMode ? 'secondary' : 'primary'}
                                className="h-11 rounded-2xl w-full font-bold text-xs shadow-lg shadow-primary-500/20"
                                icon={isSavingAsig ? Loader2 : (isEditMode ? Search : UserPlus)}
                                onClick={handleSaveAsig}
                                disabled={isSavingAsig || !newAsig.cedula || !newAsig.bodega}
                            >
                                {isSavingAsig ? 'Procesando...' : (isEditMode ? 'Guardar Cambios' : 'Confirmar Asignación')}
                            </Button>
                            {isEditMode && (
                                <Button
                                    variant="ghost"
                                    className="h-11 px-4 rounded-2xl text-[10px] font-bold text-neutral-400 hover:text-neutral-600"
                                    onClick={cancelEdit}
                                >
                                    Descartar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Listado de Asignaciones */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <UserMinus size={14} className="text-neutral-400" />
                    <Text variant="caption" weight="bold" className="uppercase tracking-widest text-neutral-400">Personal Asignado</Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {asignaciones.length === 0 ? (
                        <div className="col-span-full py-10 text-center bg-neutral-50 dark:bg-neutral-800/20 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
                            <Text variant="caption" color="text-secondary">No hay operarios asignados.</Text>
                        </div>
                    ) : (
                        asignaciones.map((asig) => (
                            <div key={asig.id} className="group relative flex flex-col p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm hover:border-primary-500 hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold text-sm border border-primary-100 dark:border-primary-500/20">
                                            {asig.nombre.charAt(0)}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="primary" size="sm" className="bg-primary-500/10 text-primary-600 border-none scale-90 -ml-1">P{asig.numero_pareja}</Badge>
                                                <Text variant="caption" weight="bold" className="leading-tight text-[11px] truncate max-w-[140px] md:max-w-[180px]">{asig.nombre}</Text>
                                            </div>
                                            {asig.nombre_companero && (
                                                <Text variant="caption" color="text-secondary" className="text-[10px] uppercase font-medium tracking-tight mt-0.5">
                                                    + {asig.nombre_companero}
                                                </Text>
                                            )}
                                        </div>
                                    </div>

                                    {/* Acciones Siempre Visibles (Garantizando usabilidad) */}
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 rounded-lg text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10"
                                            onClick={() => handleEditAsig(asig)}
                                            icon={Pencil}
                                            title="Editar Asignación"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                                            onClick={() => handleDeleteAsig(asig.id)}
                                            icon={Trash2}
                                            title="Eliminar Asignación"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {/* Ubicación Jerárquica */}
                                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 border-y border-neutral-100 dark:border-neutral-700/50">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <Text variant="caption" className="text-[9px] uppercase font-bold text-neutral-400 leading-none mb-1">Bodega</Text>
                                                <Text variant="caption" weight="bold" className="text-[11px] text-primary-600 dark:text-primary-400">{asig.bodega}</Text>
                                            </div>
                                            <div className="flex flex-col">
                                                <Text variant="caption" className="text-[9px] uppercase font-bold text-neutral-400 leading-none mb-1">Bloque</Text>
                                                <Text variant="caption" weight="bold" className="text-[11px] text-primary-600 dark:text-primary-400">{asig.bloque || 'N/A'}</Text>
                                            </div>
                                            {asig.estante && (
                                                <div className="flex flex-col">
                                                    <Text variant="caption" className="text-[9px] uppercase font-bold text-neutral-400 leading-none mb-1">Estantes</Text>
                                                    <Text variant="caption" weight="bold" className="text-[11px] text-primary-600 dark:text-primary-400 truncate max-w-[100px]">{asig.estante}</Text>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 bg-primary-500/5 px-2 py-1 rounded-lg border border-primary-500/10">
                                            <Text variant="caption" weight="bold" className="text-[9px] text-primary-500 uppercase">Items:</Text>
                                            <Text variant="caption" weight="bold" className="text-[12px] text-primary-600">{getAssignmentCount(asig)}</Text>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AsignacionSeccion;
