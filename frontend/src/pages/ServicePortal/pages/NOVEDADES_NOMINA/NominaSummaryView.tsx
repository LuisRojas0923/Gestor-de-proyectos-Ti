import React, { useState, useEffect } from 'react';
import { Title, Text, Button, Select, Input } from '../../../../components/atoms';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Send, RefreshCw, Layers } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';

const NominaSummaryView: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [resumen, setResumen] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [año, setAño] = useState(new Date().getFullYear());
    const [isExporting, setIsExporting] = useState(false);

    const fetchSummary = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/subcategorias/resumen?mes=${mes}&año=${año}`);
            setResumen(res.data);
        } catch (err) {
            console.error("Error fetching summary:", err);
            addNotification('error', 'No se pudo cargar el resumen mensual.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [mes, año]);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const res = await axios.post(`${API_CONFIG.BASE_URL}/novedades-nomina/exportar-solid`, {
                mes,
                año
            });

            // Simulación de descarga de archivo si fuera necesario, 
            // por ahora la API solo devuelve el JSON para SOLID.
            addNotification('success', 'Datos exportados correctamente a SOLID ERP.');
            console.log("Export Result:", res.data);
        } catch (err) {
            console.error("Error exporting:", err);
            addNotification('error', 'Error al exportar los datos.');
        } finally {
            setIsExporting(false);
        }
    };

    const totalGeneral = resumen.reduce((sum, item) => sum + item.total_valor, 0);
    const totalRegistros = resumen.reduce((sum, item) => sum + item.total_registros, 0);

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/service-portal/novedades-nomina')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <Title variant="h4" weight="bold">Resumen Mensual</Title>
                        <Text color="text-secondary">Consolidado de descuentos por subcategoría</Text>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <Select
                        value={mes.toString()}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMes(parseInt(e.target.value))}
                        options={meses.map((m, i) => ({ value: (i + 1).toString(), label: m }))}
                        size="sm"
                    />
                    <Input
                        type="number"
                        value={año.toString()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAño(parseInt(e.target.value))}
                        size="sm"
                        className="w-24 text-center"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                    <Text size="sm" color="text-secondary" weight="bold" className="uppercase tracking-wider">Total Valor</Text>
                    <Title variant="h2" weight="bold" className="text-blue-600 mt-2">${totalGeneral.toLocaleString()}</Title>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                    <Text size="sm" color="text-secondary" weight="bold" className="uppercase tracking-wider">Total Registros</Text>
                    <Title variant="h2" weight="bold" className="text-teal-600 mt-2">{totalRegistros}</Title>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full h-full text-lg font-bold gap-2"
                        disabled={totalRegistros === 0 || isExporting}
                        onClick={handleExport}
                    >
                        {isExporting ? <RefreshCw className="animate-spin" /> : <Send />}
                        Exportar a SOLID
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase bg-inherit">Subcategoría</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center bg-inherit">Registros</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right bg-inherit">Total Valor</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center bg-inherit">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                    </td>
                                </tr>
                            ) : resumen.map((item) => (
                                <tr key={item.subcategoria_final} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4 font-bold">{item.subcategoria_final}</td>
                                    <td className="p-4 text-center">{item.total_registros}</td>
                                    <td className="p-4 text-right font-mono font-bold text-blue-600">${item.total_valor.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/service-portal/novedades-nomina/detalle/${item.subcategoria_final}`)}>
                                            <Layers className="w-4 h-4 mr-1" /> Detalles
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default NominaSummaryView;
