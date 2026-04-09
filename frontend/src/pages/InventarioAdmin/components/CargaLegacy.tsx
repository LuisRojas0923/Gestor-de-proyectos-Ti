import React, { useState } from 'react';
import { Title, Text, Button, Input } from '../../../components/atoms';
import { FileUp, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import Icon from '../../../components/atoms/Icon';

interface CargaLegacyProps {
    apiBase: string;
    onUploadSuccess: () => void;
}

const CargaLegacy: React.FC<CargaLegacyProps> = ({ apiBase, onUploadSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [ronda, setRonda] = useState<number>(1);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; actualizados: number; errores: string[] } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('ronda', ronda.toString());

            const response = await fetch(`${apiBase}/inventario/cargar-legacy`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            setResult({
                success: data.exito,
                actualizados: data.actualizados || 0,
                errores: data.errores || []
            });

            if (data.exito || data.actualizados > 0) {
                onUploadSuccess();
            }
        } catch (error) {
            setResult({ success: false, actualizados: 0, errores: ['Error de conexión con el servidor'] });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-2xl flex gap-3">
                <Icon name={Info} className="text-blue-500 mt-1" size="sm" />
                <div className="space-y-1">
                    <Text variant="body1" className="font-bold text-blue-900 dark:text-blue-100">Instrucciones de Validación Histórica</Text>
                    <Text variant="caption" className="text-blue-700 dark:text-blue-300">
                        Sube tus archivos del año pasado para validar el motor actual. 
                        El sistema cruzará automáticamente por <strong>B. Siigo</strong> y <strong>Código (SKU)</strong>.
                    </Text>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 p-6 rounded-3xl shadow-sm space-y-4">
                    <Title level={3} className="text-sm font-bold uppercase tracking-wider text-neutral-500">1. Seleccionar Ronda</Title>
                    <div className="flex gap-2">
                        {[1, 2, 3].map(r => (
                            <Button
                                key={r}
                                onClick={() => setRonda(r)}
                                variant={ronda === r ? 'primary' : 'ghost'}
                                className={`flex-1 h-12 rounded-xl font-bold transition-all ${ronda === r ? 'shadow-md' : ''}`}
                            >
                                Conteo {r}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 p-6 rounded-3xl shadow-sm space-y-4">
                    <Title level={3} className="text-sm font-bold uppercase tracking-wider text-neutral-500">2. Cargar Archivo Legacy</Title>
                    <div className="relative group">
                        <Input
                            type="file"
                            onChange={handleFileChange}
                            accept=".xlsx, .xls"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            fullWidth
                        />
                        <div className={`
                            border-2 border-dashed rounded-2xl p-4 transition-all flex flex-col items-center justify-center gap-2
                            ${file ? 'border-primary-500 bg-primary-50/10' : 'border-neutral-200 group-hover:border-primary-400'}
                        `}>
                            <Icon name={FileUp} className={file ? 'text-primary-500' : 'text-neutral-400'} />
                            <Text variant="caption" className="font-medium">
                                {file ? file.name : 'Arrastra o selecciona el Excel de conteo'}
                            </Text>
                        </div>
                    </div>
                    
                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="w-full h-11 rounded-xl shadow-lg shadow-primary-500/20 active:scale-95 transition-transform"
                    >
                        {isUploading ? <Loader2 className="animate-spin" /> : `Sincronizar Conteo ${ronda}`}
                    </Button>
                </div>
            </div>

            {result && (
                <div className={`p-4 rounded-2xl border ${result.success ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'} animate-in fade-in slide-in-from-top-2`}>
                    <div className="flex items-center gap-3 mb-2">
                        <Icon name={result.success ? CheckCircle2 : AlertCircle} className={result.success ? 'text-green-500' : 'text-amber-500'} />
                        <Text variant="body2" className="font-bold">
                            {result.success ? 'Sincronización Exitosa' : 'Sincronización con Advertencias'}
                        </Text>
                    </div>
                    <Text variant="caption" className="block mb-2">
                        Se actualizaron <strong>{result.actualizados}</strong> registros de la Ronda {ronda}.
                    </Text>
                    {result.errores.length > 0 && (
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                            {result.errores.slice(0, 10).map((err, i) => (
                                <Text key={i} variant="caption" className="block text-red-500">• {err}</Text>
                            ))}
                            {result.errores.length > 10 && <Text variant="caption" className="text-neutral-400 italic">...y {result.errores.length - 10} errores más</Text>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CargaLegacy;
