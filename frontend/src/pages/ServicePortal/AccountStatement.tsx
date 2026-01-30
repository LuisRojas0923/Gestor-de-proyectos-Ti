import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Search,
    Calendar
} from 'lucide-react';
import {
    Button,
    Input,
    Text,
    Title,
    MaterialCard,
    Spinner
} from '../../components/atoms';
import axios from 'axios';
import { API_CONFIG } from '../../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

interface Movimiento {
    codigo: string;
    fechaaplicacion: string;
    radicado: string;
    consignacion_contabilizado: number;
    legalizacion_contabilizado: number;
    consignacion_firmadas: number;
    legalizacion_firmadas: number;
    consignacion_pendientes: number;
    legalizacion_pendientes: number;
    saldo: number;
    observaciones: string;
}

interface AccountStatementProps {
    user: any;
    onBack: () => void;
}

const AccountStatement: React.FC<AccountStatementProps> = ({ user, onBack }) => {
    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fechaDesde, setFechaDesde] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);

    const fetchEstadoCuenta = async () => {
        setIsLoading(true);
        try {
            const params = {
                cedula: user.cedula || user.id,
                desde: fechaDesde,
                hasta: fechaHasta
            };
            const res = await axios.get(`${API_BASE_URL}/viaticos/estado-cuenta`, { params });
            setMovimientos(res.data);
        } catch (err) {
            console.error("Error fetching estado cuenta:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEstadoCuenta();
    }, []);

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
                    <ArrowLeft size={20} />
                    <Text weight="medium">Volver</Text>
                </Button>
                <Title variant="h4" weight="bold" color="text-primary">
                    Estado de Cuenta
                </Title>
                <div className="w-20"></div>
            </div>

            <MaterialCard className="p-0 overflow-hidden bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] mb-6">
                <div className="bg-[var(--color-primary)] text-white p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <Title variant="h5" color="white" weight="bold">ESTADO DE CUENTA DE VIATICOS</Title>
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                            <Text variant="caption" color="white" className="opacity-70 uppercase">Cédula Viaticante</Text>
                            <Text variant="body1" color="white" weight="bold">{user.cedula || user.id}</Text>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-[var(--color-surface-variant)] border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-4">
                        <Text variant="caption" weight="bold" className="uppercase opacity-70">Nombre Empleado:</Text>
                        <Text variant="body1" weight="bold">{user.name}</Text>
                    </div>
                </div>
            </MaterialCard>

            <MaterialCard className="p-6 bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="space-y-1">
                        <Text variant="caption" color="text-secondary" className="px-1 flex items-center gap-2">
                            <Calendar size={14} /> Fecha Inicial
                        </Text>
                        <Input
                            type="date"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-1">
                        <Text variant="caption" color="text-secondary" className="px-1 flex items-center gap-2">
                            <Calendar size={14} /> Fecha Final
                        </Text>
                        <Input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <Button onClick={fetchEstadoCuenta} className="w-full md:w-auto h-11 flex items-center justify-center gap-2">
                        <Search size={20} />
                        Consultar
                    </Button>
                </div>
            </MaterialCard>

            <MaterialCard className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead>
                            <tr className="bg-[#E8EFF5] border-b border-neutral-300">
                                <th rowSpan={2} className="p-3 border-r border-neutral-300 text-center"><Text variant="caption" weight="bold" className="text-[#334155] text-[11px]">FECHA</Text></th>
                                <th rowSpan={2} className="p-3 border-r border-neutral-300 text-center"><Text variant="caption" weight="bold" className="text-[#334155] text-[11px]">RADICADO</Text></th>
                                <th colSpan={2} className="p-2 text-center border-r border-neutral-300 border-b border-neutral-300 bg-[#E8EFF5]"><Text variant="caption" weight="bold" className="text-[#334155] text-[11px]">CONTABILIZADO</Text></th>
                                <th colSpan={2} className="p-2 text-center border-r border-neutral-300 border-b border-neutral-300 bg-[#E8EFF5]"><Text variant="caption" weight="bold" className="text-[#334155] text-[11px]">EN CANJE</Text></th>
                                <th colSpan={2} className="p-2 text-center border-r border-neutral-300 border-b border-neutral-300 bg-[#E8EFF5]"><Text variant="caption" weight="bold" className="text-[#334155] text-[11px]">PENDIENTES</Text></th>
                                <th rowSpan={2} className="p-3 text-center border-r border-neutral-300"><Text variant="caption" weight="bold" className="text-[#334155] text-[11px]">SALDO</Text></th>
                                <th rowSpan={2} className="p-3 text-left"><Text variant="caption" weight="bold" className="text-[#334155] text-[11px]">OBSERVACIONES</Text></th>
                            </tr>
                            <tr className="bg-[#F8FAFC] border-b border-neutral-300">
                                <th className="p-2 text-center border-r border-neutral-300 text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">Consignación</th>
                                <th className="p-2 text-center border-r border-neutral-300 text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">Legalización</th>
                                <th className="p-2 text-center border-r border-neutral-300 text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">Consignación</th>
                                <th className="p-2 text-center border-r border-neutral-300 text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">Legalización</th>
                                <th className="p-2 text-center border-r border-neutral-300 text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">Consignación</th>
                                <th className="p-2 text-center border-r border-neutral-300 text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">Legalización</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10} className="p-10 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Spinner size="lg" />
                                            <Text color="text-secondary">Consultando movimientos en ERP...</Text>
                                        </div>
                                    </td>
                                </tr>
                            ) : movimientos.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-10 text-center">
                                        <Text color="text-secondary">No se encontraron movimientos en este rango de fechas.</Text>
                                    </td>
                                </tr>
                            ) : movimientos.map((mov, i) => (
                                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                                    <td className="p-3 border-r border-neutral-200 whitespace-nowrap text-center bg-white">
                                        <Text className="text-[12px] text-neutral-700 font-medium">{new Date(mov.fechaaplicacion).toLocaleDateString('es-CO')}</Text>
                                    </td>
                                    <td className="p-3 border-r border-neutral-200 bg-white">
                                        <Text weight="bold" className="text-[12px] text-neutral-800">{mov.radicado}</Text>
                                    </td>
                                    {/* CONTABILIZADO */}
                                    <td className="p-3 text-right border-r border-neutral-200 font-mono text-[12px] text-neutral-600">
                                        {mov.consignacion_contabilizado > 0 ? `$${mov.consignacion_contabilizado.toLocaleString()}` : ''}
                                    </td>
                                    <td className="p-3 text-right border-r border-neutral-200 font-mono text-[12px] text-neutral-600">
                                        {mov.legalizacion_contabilizado > 0 ? `$${mov.legalizacion_contabilizado.toLocaleString()}` : ''}
                                    </td>
                                    {/* EN CANJE (FIRMADO) */}
                                    <td className="p-3 text-right border-r border-neutral-200 font-mono text-[12px] text-neutral-600">
                                        {mov.consignacion_firmadas > 0 ? `$${mov.consignacion_firmadas.toLocaleString()}` : ''}
                                    </td>
                                    <td className="p-3 text-right border-r border-neutral-200 font-mono text-[12px] text-neutral-600">
                                        {mov.legalizacion_firmadas > 0 ? `$${mov.legalizacion_firmadas.toLocaleString()}` : ''}
                                    </td>
                                    {/* PENDIENTES */}
                                    <td className="p-3 text-right border-r border-neutral-200 font-mono text-[12px] text-neutral-600">
                                        {mov.consignacion_pendientes > 0 ? `$${mov.consignacion_pendientes.toLocaleString()}` : ''}
                                    </td>
                                    <td className="p-3 text-right border-r border-neutral-200 font-mono text-[12px] text-amber-600 font-medium">
                                        {mov.legalizacion_pendientes > 0 ? `$${mov.legalizacion_pendientes.toLocaleString()}` : ''}
                                    </td>
                                    {/* SALDO */}
                                    <td className="p-3 text-right border-r border-neutral-200 font-mono text-[12px] font-bold text-neutral-900 bg-neutral-50">
                                        ${mov.saldo.toLocaleString()}
                                    </td>
                                    <td className="p-3 min-w-[250px] bg-white">
                                        <Text variant="caption" className="text-[11px] text-neutral-500 uppercase leading-snug">
                                            {mov.observaciones || ''}
                                        </Text>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </MaterialCard>
        </div>
    );
};

export default AccountStatement;
