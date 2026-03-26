import React from 'react';
import { Title, Text, Button, Icon } from '../../../components/atoms';
import { FileUp, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface CargaMasivaProps {
    conteoName: string;
    setConteoName: (val: string) => void;
    file: File | null;
    setFile: (f: File | null) => void;
    handleUpload: () => Promise<void>;
    isUploading: boolean;
    uploadResult: { success: boolean; created: number; errors: string[] } | null;
    setUploadResult: (res: any) => void;
    /** Descripción entre la fila de herramientas y la fila de ronda/archivo/nombre */
    inventoryHeaderSlot?: React.ReactNode;
    /** Selector de ronda (C1–C4), antes del archivo y el nombre de conteo */
    rondaSlot?: React.ReactNode;
}

const CargaMasiva: React.FC<CargaMasivaProps> = ({
    conteoName,
    setConteoName,
    file,
    setFile,
    handleUpload,
    isUploading,
    uploadResult,
    setUploadResult,
    inventoryHeaderSlot,
    rondaSlot
}) => {
    return (
        <div className="flex flex-col gap-4 w-full group/master">
            {/* Cabecera Técnica */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <Title variant="h6" weight="bold" className="text-sm tracking-tight text-primary-600 dark:text-primary-400">Panel de Operaciones</Title>
                        <div className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                        <Text variant="caption" color="text-secondary" className="font-medium uppercase tracking-widest text-[9px] opacity-70">Inventario 2026</Text>
                    </div>
                    {inventoryHeaderSlot}
                </div>
                {rondaSlot}
            </div>

            {/* Barra de Herramientas Maestra (Input Group Style) */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 bg-neutral-50 dark:bg-neutral-800/30 p-2 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-inner">
                {/* Input: Nombre de Conteo */}
                <div className="flex-1 min-w-[140px] relative">
                    <input
                        type="text"
                        value={conteoName}
                        onChange={(e) => setConteoName(e.target.value)}
                        placeholder="Nombre: ej. Anual_2026"
                        className="w-full h-10 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all placeholder:text-neutral-400 shadow-sm"
                    />
                </div>

                {/* Input: Selector de Archivos (Estilizado) */}
                <div className="relative flex-1 min-w-[160px] group/file">
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => { if (e.target.files) { setFile(e.target.files[0]); setUploadResult(null); } }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`h-10 flex items-center gap-3 px-4 rounded-xl border border-dashed transition-all duration-300 ${file ? 'border-primary-500 bg-primary-500/5' : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-primary-400'}`}>
                        <Icon name={FileUp} size="sm" color={file ? 'primary' : 'secondary'} className={file ? 'text-primary-500' : 'text-neutral-400'} />
                        <Text variant="body2" weight="medium" className={`text-[11px] truncate ${file ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-500'}`}>
                            {file ? file.name : 'Vincular Excel SIIGO'}
                        </Text>
                    </div>
                </div>

                {/* Botón de Acción y Resultado */}
                <div className="flex items-center gap-2 lg:pl-2 shrink-0">
                    {uploadResult && (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border animate-in zoom-in-95 duration-300 ${uploadResult.success ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
                            <Icon name={uploadResult.success ? CheckCircle : AlertCircle} size="xs" />
                            <span>{uploadResult.success ? 'Listo' : 'Error'}</span>
                        </div>
                    )}
                    
                    <Button 
                        variant="primary" 
                        onClick={handleUpload} 
                        disabled={!file || !conteoName || isUploading} 
                        className="h-10 px-6 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:grayscale"
                    >
                        {isUploading ? <Loader2 size={16} className="animate-spin" /> : 'Cargar Inventario'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CargaMasiva;
