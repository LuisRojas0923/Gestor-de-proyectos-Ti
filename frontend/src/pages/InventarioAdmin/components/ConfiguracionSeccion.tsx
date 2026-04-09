import React from 'react';
import { Button } from '../../../components/atoms';
import CargaMasiva from './CargaMasiva';
import { API_CONFIG } from '../../../config/api';

interface ConfiguracionSeccionProps {
    conteoName: string;
    setConteoName: (s: string) => void;
    file: File | null;
    setFile: (f: File | null) => void;
    handleUploadMaestra: () => Promise<void>;
    isUploading: boolean;
    handleUploadTransito: () => Promise<void>;
    isUploadingTransito: boolean;
    uploadResult: any;
    setUploadResult: (r: any) => void;
    limpiarPrevio: boolean;
    setLimpiarPrevio: (b: boolean) => void;
    rondaActiva: number;
    isUpdatingConfig: boolean;
    handleUpdateRonda: (r: number) => void;
    uploadProgress: number;
    handleGeneratePlanilla0: () => Promise<void>;
}

const ConfiguracionSeccion: React.FC<ConfiguracionSeccionProps> = ({
    conteoName, setConteoName,
    file, setFile,
    handleUploadMaestra, isUploading,
    handleUploadTransito, isUploadingTransito,
    uploadResult, setUploadResult,
    limpiarPrevio, setLimpiarPrevio,
    rondaActiva, isUpdatingConfig,
    handleUpdateRonda,
    uploadProgress,
    handleGeneratePlanilla0
}) => {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-5 shadow-sm space-y-4">
            <CargaMasiva 
                conteoName={conteoName}
                setConteoName={setConteoName}
                file={file}
                setFile={setFile}
                handleUpload={handleUploadMaestra}
                isUploading={isUploading}
                handleUploadTransito={handleUploadTransito}
                isUploadingTransito={isUploadingTransito}
                apiBase={API_CONFIG.BASE_URL}
                uploadResult={uploadResult}
                setUploadResult={setUploadResult}
                limpiarPrevio={limpiarPrevio}
                setLimpiarPrevio={setLimpiarPrevio}
                uploadProgress={uploadProgress}
                rondaSlot={
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-neutral-100 dark:border-neutral-700 shadow-sm w-fit">
                            {[1, 2, 3].map(r => (
                                <Button
                                    key={r}
                                    onClick={() => handleUpdateRonda(r)}
                                    disabled={isUpdatingConfig}
                                    variant={rondaActiva === r ? 'primary' : 'ghost'}
                                    className={`w-10 h-8 rounded-lg font-bold text-xs transition-all ${rondaActiva === r ? 'shadow-sm scale-105' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                                >
                                    C{r}
                                </Button>
                            ))}
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            className="!bg-neutral-100 dark:!bg-neutral-800 !text-neutral-600 dark:!text-neutral-400 border border-neutral-200 dark:border-neutral-700 !rounded-lg !px-3 !h-10 !text-[10px] font-bold hover:!bg-neutral-200 transition-all shadow-sm"
                            onClick={() => handleGeneratePlanilla0()}
                        >
                            Planilla 0
                        </Button>
                    </div>
                }
            />

        </div>
    );
};

export default ConfiguracionSeccion;
