import React from 'react';
import { Title, Text, Button, Input, Select, Badge, ProgressBar, MultiSelect } from '../../../components/atoms';
import { UserPlus, UserMinus, Trash2, Search, Loader2 } from 'lucide-react';

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
    getNivelOptions
}) => {
    const isEditMode = editingAsigId !== null;
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
                            <Text variant="caption" weight="bold" className="uppercase tracking-[0.2em] text-[10px]">Cobertura de Tareas Físicas</Text>
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

            {/* Formulario de Asignación */}
            <div className="grid grid-cols-2 lg:grid-cols-12 gap-5 p-6 bg-neutral-50/50 dark:bg-neutral-800/30 rounded-3xl border border-neutral-100 dark:border-neutral-700 items-end shadow-inner">
                <div className="space-y-2 lg:col-span-2">
                    <Text variant="caption" weight="bold" color="text-secondary" className="text-[10px] uppercase tracking-wider ml-1 block mb-0.5">Cédula</Text>
                    <div className="relative">
                        <Input
                            value={newAsig.cedula}
                            onChange={(e) => setNewAsig((prev: any) => ({ ...prev, cedula: e.target.value }))}
                            placeholder="Cédula"
                            className="rounded-xl h-10 text-xs pr-9 border-neutral-200"
                            disabled={isSearchingEmpleado}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isSearchingEmpleado ? <Loader2 size={12} className="animate-spin text-primary-500" /> : <Search size={14} className="text-neutral-300" />}
                        </div>
                    </div>
                </div>

                <div className="space-y-2 lg:col-span-3">
                    <Text variant="caption" weight="bold" color="text-secondary" className="text-[10px] uppercase tracking-wider ml-1 block mb-0.5">Nombre del Operario</Text>
                    <Input
                        value={newAsig.nombre}
                        onChange={(e) => setNewAsig((prev: any) => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Nombre completo"
                        className="rounded-xl h-10 text-xs disabled:opacity-80 border-neutral-200"
                        disabled={isSearchingEmpleado}
                    />
                </div>

                <div className="lg:col-span-6 grid grid-cols-4 gap-3">
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
                        options={getEstanteOptions(newAsig.bodega, newAsig.bloque).filter(o => o.value !== '')}
                        value={newAsig.estante ? newAsig.estante.split(',').map((s: string) => s.trim()) : []}
                        onChange={(vals) => setNewAsig((prev: any) => ({ ...prev, estante: vals.join(','), nivel: '' }))}
                        disabled={!newAsig.bloque}
                        className="col-span-1"
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

                <div className="lg:col-span-1 flex flex-col gap-2">
                    <Button 
                        variant={isEditMode ? 'secondary' : 'primary'}
                        className="h-10 rounded-xl w-full font-bold text-[11px]" 
                        icon={isEditMode ? Loader2 : UserPlus}
                        onClick={handleSaveAsig}
                        disabled={isSavingAsig || !newAsig.cedula || !newAsig.bodega}
                    >
                        {isSavingAsig ? '...' : (isEditMode ? 'Actualizar' : 'Asignar')}
                    </Button>
                    {isEditMode && (
                        <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-[10px] h-6 rounded-lg underline"
                            onClick={cancelEdit}
                        >
                            Cancelar
                        </Button>
                    )}
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
                            <div key={asig.id} className="group relative flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 shadow-sm hover:border-primary-500 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold text-xs">
                                        {asig.nombre.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                        <Text variant="caption" weight="bold" className="leading-tight">{asig.nombre}</Text>
                                        <Text variant="caption" color="text-secondary" className="text-[9px] uppercase tracking-tighter">
                                            {asig.bodega} • {asig.bloque}-{asig.estante}
                                        </Text>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="p-1 px-2 h-7 rounded-lg text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10"
                                        onClick={() => handleEditAsig(asig)}
                                    >
                                        Editar
                                    </Button>
                                    <Button 
                                        variant="ghost"
                                        size="sm"
                                        className="p-1 h-7 rounded-lg text-neutral-300 hover:text-red-500"
                                        onClick={() => handleDeleteAsig(asig.id)}
                                        icon={Trash2}
                                    />
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
