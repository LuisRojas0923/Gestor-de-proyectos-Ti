import React from 'react';
import { Text, Button, Icon, Input, ProgressBar } from '../../../components/atoms';
import { FileUp, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface CargaMasivaProps {
    conteoName: string;
    setConteoName: (val: string) => void;
    file: File | null;
    setFile: (f: File | null) => void;
    handleUpload: () => Promise<void>;
    isUploading: boolean;
    handleUploadTransito?: () => Promise<void>;
    isUploadingTransito?: boolean;
    apiBase?: string;
    uploadResult: { success: boolean; created: number; errors: string[] } | null;
    setUploadResult: (res: any) => void;
    limpiarPrevio: boolean;
    setLimpiarPrevio: (val: boolean) => void;
    /** Selector de ronda (C1–C4), antes del archivo y el nombre de conteo */
    rondaSlot?: React.ReactNode;
    uploadProgress: number;
}

const CargaMasiva: React.FC<CargaMasivaProps> = ({
    conteoName,
    setConteoName,
    file,
    setFile,
    handleUpload,
    isUploading,
    handleUploadTransito,
    isUploadingTransito,
    apiBase = 'http://localhost:8001',
    uploadResult,
    setUploadResult,
    limpiarPrevio,
    setLimpiarPrevio,
    rondaSlot,
    uploadProgress
}) => {
    return (
        <div className="flex flex-col gap-4 w-full group/master">
            {/* Cabecera Técnica Simplificada */}
            <div className="flex flex-col md:flex-row md:items-center justify-end gap-3">
                {rondaSlot}
            </div>

            {/* Barra de Herramientas Maestra */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 bg-neutral-50 dark:bg-neutral-800/30 p-2 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-inner">
                {/* Input: Nombre de Conteo */}
                <div className="flex-1 min-w-[140px]">
                    <Input
                        type="text"
                        value={conteoName}
                        onChange={(e) => setConteoName(e.target.value)}
                        placeholder="Nombre: ej. Anual_2026"
                        className="w-full h-10 shadow-sm"
                        size="sm"
                    />
                </div>

                {/* Input: Selector de Archivos */}
                <div className="relative flex-1 min-w-[160px] group/file">
                    <input // @audit-ok
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setUploadResult(null); } }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <div className={`h-10 flex items-center gap-3 px-4 rounded-xl border border-dashed transition-all duration-300 ${file ? 'border-primary-500 bg-primary-500/5' : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-primary-400'}`}>
                        <Icon name={FileUp} size="sm" className={file ? 'text-primary-500' : 'text-neutral-400'} />
                        <Text variant="body2" weight="medium" className={`text-[11px] truncate ${file ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-500'}`}>
                            {file ? file.name : 'Vincular Excel SIIGO'}
                        </Text>
                    </div>
                </div>

                {/* Checkbox: Limpiar Previo */}
                <div 
                    onClick={() => setLimpiarPrevio(!limpiarPrevio)}
                    className={`flex items-center gap-2 px-3 h-10 rounded-xl border cursor-pointer transition-all duration-300 ${limpiarPrevio ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-amber-400'}`}
                    title="Realiza un respaldo (Snapshot) y limpia el inventario antes de cargar"
                >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${limpiarPrevio ? 'bg-amber-500 border-amber-500' : 'border-neutral-300'}`}>
                        {limpiarPrevio && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                    </div>
                    <div className="flex flex-col">
                        <Text variant="caption" weight="bold" className={`text-[9px] uppercase tracking-tighter ${limpiarPrevio ? 'text-amber-700' : 'text-neutral-500'}`}>Limpiar previo</Text>
                        <Text variant="caption" className="text-[8px] leading-none opacity-60">Snapshot seguridad</Text>
                    </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col gap-2 shrink-0 lg:pl-2">
                    <div className="flex gap-2">
                        <Button 
                            variant="primary" 
                            onClick={handleUpload} 
                            disabled={!file || isUploading} 
                            className="h-10 px-5 rounded-xl text-[10px] font-bold shadow-md active:scale-95 disabled:grayscale"
                        >
                            {isUploading ? <Loader2 size={14} className="animate-spin" /> : 'Cargar Maestra'}
                        </Button>

                        {handleUploadTransito && (
                            <Button 
                                variant="secondary" 
                                onClick={handleUploadTransito} 
                                disabled={!file || isUploadingTransito} 
                                className="h-10 px-5 rounded-xl text-[10px] font-bold shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                {isUploadingTransito ? <Loader2 size={14} className="animate-spin" /> : 'Cargar Tránsito'}
                            </Button>
                        )}
                    </div>
                    
                    {/* Templates */}
                    <div className="flex items-center justify-center gap-4 px-1">
                        <a href={`${apiBase}/inventario/plantilla-maestra`} download="plantilla_maestra_2026.xlsx" className="text-[9px] font-bold text-neutral-400 hover:text-primary-500 uppercase tracking-tighter">Maestra</a>
                        <div className="w-1 h-1 rounded-full bg-neutral-200" />
                        <a href={`${apiBase}/inventario/plantilla-transito`} download="plantilla_transito_2026.xlsx" className="text-[9px] font-bold text-neutral-400 hover:text-secondary-500 uppercase tracking-tighter">Tránsito</a>
                    </div>
                </div>
            </div>

            {/* Barra de Progreso de Subida */}
            {(isUploading || isUploadingTransito) && (
                <div className="px-1 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                        <Text variant="caption" weight="bold" className="text-[9px] uppercase tracking-widest text-primary-600 dark:text-primary-400">
                            {isUploading ? 'Subiendo Maestra...' : 'Subiendo Tránsito...'}
                        </Text>
                        <Text variant="caption" weight="bold" className="text-[10px] text-primary-500">{uploadProgress}%</Text>
                    </div>
                    <ProgressBar progress={uploadProgress} variant="primary" className="h-1.5 shadow-sm" />
                </div>
            )}

            {/* Detailed Feedback Results */}
            {uploadResult && (
                <div className={`mt-2 p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-500 ${uploadResult.success ? 'bg-green-50/50 border-green-100' : 'bg-amber-50/50 border-amber-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${uploadResult.success ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                                <Icon name={uploadResult.success ? CheckCircle : AlertCircle} size="xs" />
                            </div>
                            <div>
                                <Text variant="body2" weight="bold" className={uploadResult.success ? 'text-green-800' : 'text-amber-800'}>
                                    {uploadResult.success ? 'Carga Completada' : 'Carga con Observaciones'}
                                </Text>
                                <Text variant="caption" className="text-neutral-500">
                                    Se procesaron <strong>{uploadResult.created}</strong> registros.
                                </Text>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setUploadResult(null)} className="h-8 w-8 p-0 rounded-full hover:bg-neutral-200/50">×</Button>
                    </div>

                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                        <div className="space-y-2 mt-4 pt-4 border-t border-neutral-200/50">
                            <div className="flex items-center gap-2 text-amber-700 font-bold text-[9px] uppercase tracking-wider">
                                <AlertCircle size={14} />
                                <Text variant="caption" weight="bold" className="uppercase tracking-widest text-[9px]">Log de Errores ({uploadResult.errors.length})</Text>
                            </div>
                            <div className="max-h-32 overflow-y-auto pr-2 space-y-1.5">
                                {uploadResult.errors.map((err, i) => (
                                    <div key={`${err.id || err.cedula || 'err'}-${i}`} className="flex gap-2 p-2 bg-white/50 dark:bg-neutral-800/20 rounded-lg border border-neutral-100 dark:border-neutral-700">
                                        <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                        <Text variant="caption" className="text-[10px] text-neutral-600">{err}</Text>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CargaMasiva;
