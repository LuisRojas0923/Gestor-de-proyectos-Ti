import React, { useState } from 'react';
import { Title, Text, Button, Select, Input } from '../../../../components/atoms';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, History } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';

const NominaUploadView: React.FC = () => {
    const { category, subcategory } = useParams<{ category: string; subcategory: string }>();
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [año, setAño] = useState(new Date().getFullYear());
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) return;
        setIsUploading(true);
        setUploadProgress('uploading');

        try {
            const archivoIds: number[] = [];

            // Subir cada archivo de forma secuencial (el backend acepta uno a la vez)
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('mes', mes.toString());
                formData.append('año', año.toString());
                formData.append('subcategoria', subcategory || '');
                formData.append('categoria', category || '');

                const res = await axios.post(`${API_CONFIG.BASE_URL}/novedades-nomina/archivos`, formData);
                archivoIds.push(res.data.id);
            }

            setUploadProgress('processing');

            // Procesar cada archivo en orden
            for (const archivoId of archivoIds) {
                await axios.post(`${API_CONFIG.BASE_URL}/novedades-nomina/archivos/${archivoId}/procesar`);
            }

            setUploadProgress('done');
            addNotification('success', `${archivoIds.length} archivo(s) procesado(s) correctamente.`);

            // Redirigir al preview del último archivo
            const ultimoId = archivoIds[archivoIds.length - 1];
            setTimeout(() => {
                navigate(`/service-portal/novedades-nomina/preview/${ultimoId}`);
            }, 1000);

        } catch (err) {
            console.error("Error uploading/processing:", err);
            setUploadProgress('error');
            addNotification('error', 'Error al procesar el archivo.');
        } finally {
            setIsUploading(false);
        }
    };

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <Title variant="h4" weight="bold">Cargar Archivo</Title>
                    <Text color="text-secondary">{category} / {subcategory}</Text>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select
                        label="Mes de Facturación"
                        value={mes.toString()}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMes(parseInt(e.target.value))}
                        options={meses.map((m, i) => ({ value: (i + 1).toString(), label: m }))}
                    />
                    <Input
                        label="Año"
                        type="number"
                        value={año.toString()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAño(parseInt(e.target.value))}
                    />
                </div>

                <div className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${files.length > 0 ? 'border-teal-500 bg-teal-50/10' : 'border-slate-300 dark:border-slate-600 hover:border-[var(--color-primary)]'
                    }`}>
                    <input type="file" // @audit-ok
                        id="file-upload"
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleFileChange}
                        accept=".pdf,.csv,.xlsx,.xls"
                    />
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto text-slate-400">
                            {files.length > 0 ? <FileText className="w-8 h-8 text-teal-500" /> : <Upload className="w-8 h-8" />}
                        </div>
                        <div>
                            <Text weight="bold">
                                {files.length > 0
                                    ? (files.length === 1 ? files[0].name : `${files.length} archivos seleccionados`)
                                    : "Selecciona o arrastra los archivos"}
                            </Text>
                            <Text size="sm" color="text-secondary">Soporta PDF, CSV, Excel (xlsx)</Text>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <Button
                        variant="primary"
                        className="px-12 py-4 rounded-xl text-lg font-bold shadow-lg shadow-blue-500/20"
                        disabled={files.length === 0 || isUploading}
                        onClick={handleUpload}
                    >
                        {isUploading ? (
                            <Text as="span" color="inherit" className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                {uploadProgress === 'uploading' ? 'Subiendo...' : 'Procesando...'}
                            </Text>
                        ) : 'Procesar Archivo'}
                    </Button>

                    {uploadProgress === 'done' && (
                        <div className="flex items-center gap-2 text-teal-600 animate-bounce">
                            <CheckCircle className="w-5 h-5" />
                            <Text weight="bold">¡Listo! Redirigiendo...</Text>
                        </div>
                    )}

                    {uploadProgress === 'error' && (
                        <div className="flex items-center gap-2 text-rose-600">
                            <AlertCircle className="w-5 h-5" />
                            <Text weight="bold">Ocurrió un error al procesar el archivo.</Text>
                        </div>
                    )}
                </div>
            </div>

            {/* Historial de la subcategoría */}
            <div
                onClick={() => navigate(`/service-portal/novedades-nomina/historial?subcategoria=${encodeURIComponent(subcategory || '')}`)}
                className="group flex items-center gap-4 p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)] hover:shadow-lg transition-all cursor-pointer"
            >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                    <History className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                    <Text weight="bold">Histórico de cargas</Text>
                    <Text size="sm" color="text-secondary">Ver archivos cargados anteriormente para {subcategory}</Text>
                </div>
                <ArrowLeft className="w-4 h-4 text-[var(--color-text-secondary)] rotate-180 group-hover:translate-x-1 transition-transform" />
            </div>
        </div>
    );
};

export default NominaUploadView;
