import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input, Select } from '../../../../components/atoms';
import { useAppContext } from '../../../../context/AppContext';
import { ArrowLeft, Search, Filter, Download, FileSpreadsheet } from 'lucide-react';
import { ImpuestosService } from '../../../../services/ImpuestosService';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';

interface Formato2276DataTableProps {
    onBack: () => void;
}

const Formato2276DataTable: React.FC<Formato2276DataTableProps> = ({ onBack }) => {
    const { state } = useAppContext();
    const { user } = state;
    const { addNotification } = useNotifications();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState<number | string>('');

    const isContabilidad = user?.role === 'contabilidad' || user?.role === 'admin' || user?.role === 'admin_sistemas';

    if (!isContabilidad) {
        return <Navigate to="/service-portal/contabilidad" replace />;
    }

    useEffect(() => {
        fetchData();
    }, [selectedYear]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await ImpuestosService.getRegistrosExogena(selectedYear ? Number(selectedYear) : undefined);
            setData(res);
        } catch (err: any) {
            addNotification('error', err || 'Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(item => 
        item.nitb.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pno.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pap.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={onBack} size="sm" className="p-2" icon={ArrowLeft} />
                    <div>
                        <Title variant="h3" color="text-primary">Registros Formato 2276</Title>
                        <Text variant="caption" color="text-secondary">Visor de información exógena cargada en el sistema</Text>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Input 
                        placeholder="Buscar por NIT o Nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={Search}
                        className="w-full md:w-64"
                        fullWidth={false}
                    />
                    <Select 
                        className="w-40"
                        value={selectedYear.toString()}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        options={[
                            { value: "", label: "Todos los años" },
                            ...Array.from({ length: 5 }, (_, i) => {
                                const year = (new Date().getFullYear() - i).toString();
                                return { value: year, label: year };
                            })
                        ]}
                    />
                </div>
            </div>

            {/* Table Container */}
            <MaterialCard className="overflow-hidden border-none shadow-premium bg-white dark:bg-neutral-900">
                <div className="relative overflow-auto max-h-[calc(100vh-280px)] scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
                    <table className="w-full text-left border-collapse min-w-[1500px]">
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-[#000080] text-white">
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider sticky left-0 z-30 bg-[#000080]">Año</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider sticky left-[60px] z-30 bg-[#000080]">Documento</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">Beneficiario</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">Salarios (PASA)</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">Ingresos Brutos</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">Salud</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">Pensión</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">Retenciones</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">Dirección</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">Municipio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 10 }).map((_, j) => (
                                            <td key={j} className="p-4"><div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <td className="p-4 text-sm font-medium sticky left-0 bg-white dark:bg-neutral-900">{item.ano_gravable}</td>
                                        <td className="p-4 text-sm font-bold text-primary-600 dark:text-primary-400 sticky left-[60px] bg-white dark:bg-neutral-900">
                                            {item.nitb}
                                        </td>
                                        <td className="p-4 text-sm">
                                            {item.pno} {item.ono} {item.pap} {item.sap}
                                        </td>
                                        <td className="p-4 text-sm font-mono">${item.pasa.toLocaleString()}</td>
                                        <td className="p-4 text-sm font-mono">${item.tingbtp.toLocaleString()}</td>
                                        <td className="p-4 text-sm font-mono text-danger-500">${item.apos.toLocaleString()}</td>
                                        <td className="p-4 text-sm font-mono text-danger-500">${item.apof.toLocaleString()}</td>
                                        <td className="p-4 text-sm font-mono text-success-600 dark:text-success-400 font-bold">${item.vare.toLocaleString()}</td>
                                        <td className="p-4 text-sm text-neutral-500">{item.dir || '-'}</td>
                                        <td className="p-4 text-sm text-neutral-500">{item.mun || '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-50">
                                            <FileSpreadsheet size={48} />
                                            <Text>No se encontraron registros para los filtros aplicados</Text>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer / Stats */}
                {!loading && data.length > 0 && (
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-[var(--color-border)] flex justify-between items-center">
                        <Text variant="caption">Mostrando {filteredData.length} de {data.length} registros</Text>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <Text variant="caption" className="block">Total Retenciones</Text>
                                <Text weight="bold" className="text-success-600">
                                    ${filteredData.reduce((acc, curr) => acc + curr.vare, 0).toLocaleString()}
                                </Text>
                            </div>
                        </div>
                    </div>
                )}
            </MaterialCard>
        </div>
    );
};

export default Formato2276DataTable;
