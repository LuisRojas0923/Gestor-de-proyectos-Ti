import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Search,
    Calendar,
    Download
} from 'lucide-react';
import {
    Button,
    Input,
    Text,
    Title,
    MaterialCard,
    Spinner
} from '../../../components/atoms';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';
import { generateAccountStatementPDF } from '../../../utils/generateAccountStatementPDF';

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

interface UserProps {
    id?: string;
    cedula?: string;
    name?: string;
    [key: string]: any;
}

interface AccountStatementProps {
    user: UserProps;
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
            const res = await axios.get<Movimiento[]>(`${API_BASE_URL}/viaticos/estado-cuenta`, { params });
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
        <div className="flex flex-col h-[calc(100vh-70px)] overflow-hidden pb-2 bg-[var(--color-background)]">
            {/* BLOQUE SUPERIOR: FIJO */}
            <div className="flex-none space-y-3 px-1 pb-4">
                <div className="flex items-center justify-between py-1 relative h-[50px] bg-[var(--color-background)]">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="text-neutral-700 hover:bg-white/10 dark:text-neutral-300 dark:hover:bg-neutral-800 px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
                    >
                        <ArrowLeft size={18} />
                        <Text weight="medium" className="text-base font-medium text-left text-gray-900 dark:text-gray-100 hidden sm:inline">
                            Volver
                        </Text>
                    </Button>
                    <Title variant="h5" weight="bold" color="text-primary" className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] sm:text-sm md:text-lg uppercase tracking-tight top-10 md:top-1/2 md:-translate-y-1/2">
                        Estado de Cuenta de Viáticos
                    </Title>
                    <div className="w-20"></div>
                </div>

                {/* Tarjeta de Información Compacta */}
                <MaterialCard className="p-0 overflow-hidden bg-[var(--color-surface)] rounded-xl shadow-md border border-[var(--color-border)]">
                    <div className="bg-[var(--color-primary)] text-white px-3 py-2 flex justify-between items-center">
                        <Title variant="h6" color="white" weight="bold" className="text-sm uppercase tracking-wider">Resumen de Cuenta</Title>
                        <div className="bg-white/10 px-3 py-0.5 rounded-lg border border-white/20">
                            <Text variant="caption" color="white" className="opacity-90 uppercase text-[9px] font-bold">Cédula: {user.cedula || user.id}</Text>
                        </div>
                    </div>
                    <div className="px-3 py-2 bg-[var(--color-surface-variant)] flex items-center gap-2">
                        <Text variant="caption" weight="bold" className="uppercase opacity-70 text-[10px]">Empleado:</Text>
                        <Text variant="body2" weight="bold" className="text-xs uppercase">{user.name}</Text>
                    </div>
                </MaterialCard>

                {/* Filtros Compactos */}
                <MaterialCard className="p-3 bg-[var(--color-surface)] rounded-xl shadow-md border border-[var(--color-border)]">
                    <div className="flex flex-wrap md:flex-nowrap items-end gap-3">
                        <div className="flex-1 min-w-[140px] space-y-0.5">
                            <Text className="px-1 font-bold opacity-70 text-[10px] text-secondary flex items-center gap-1.5 leading-none">
                                <Calendar size={12} /> FECHA INICIAL
                            </Text>
                            <Input
                                type="date"
                                value={fechaDesde}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFechaDesde(e.target.value)}
                                className="w-full h-8 text-[11px] px-2 shadow-sm border-neutral-200 focus:border-primary"
                            />
                        </div>
                        <div className="flex-1 min-w-[140px] space-y-0.5">
                            <Text className="px-1 font-bold opacity-70 text-[10px] text-secondary flex items-center gap-1.5 leading-none">
                                <Calendar size={12} /> FECHA FINAL
                            </Text>
                            <Input
                                type="date"
                                value={fechaHasta}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFechaHasta(e.target.value)}
                                className="w-full h-8 text-[11px] px-2 shadow-sm border-neutral-200 focus:border-primary"
                            />
                        </div>
                        <Button
                            variant="erp"
                            size="sm"
                            onClick={fetchEstadoCuenta}
                            icon={Search}
                            className="h-8 shadow-sm font-bold"
                        >
                            Consultar
                        </Button>
                        <Button
                            variant="erp"
                            size="sm"
                            onClick={() => generateAccountStatementPDF(user, movimientos)}
                            disabled={movimientos.length === 0 || isLoading}
                            icon={Download}
                            className="h-8 shadow-sm font-bold ml-auto md:ml-0"
                        >
                            Descargar PDF
                        </Button>
                    </div>
                </MaterialCard>
            </div>

            {/* BLOQUE DE TABLA: CON SCROLL INDEPENDIENTE */}
            <MaterialCard className="flex-1 min-h-0 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden flex flex-col mx-1 h-full">
                <div className="overflow-y-auto flex-1 min-h-0 h-full scroll-smooth">
                    <table className="account-statement-table w-full text-left border-separate border-spacing-0 min-w-[1100px]">
                        <thead className="sticky top-0 z-[30] shadow-sm">
                            <tr className="bg-[#E8EFF5] h-[30px]">
                                <th rowSpan={2} className="p-3 h-[60px] border-r border-b border-white/20 bg-[#002060] text-center shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">
                                    <Text variant="caption" weight="bold" className="text-white text-[11px]">FECHA</Text>
                                </th>
                                <th rowSpan={2} className="p-3 h-[60px] border-r border-b border-white/20 bg-[#002060] text-center shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">
                                    <Text variant="caption" weight="bold" className="text-white text-[11px]">RADICADO</Text>
                                </th>
                                <th colSpan={2} className="py-1 px-2 h-[30px] min-h-[30px] max-h-[30px] border-r border-b border-white/20 bg-[#002060] text-center shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">
                                    <Text variant="caption" weight="bold" className="text-white text-[11px] leading-none">CONTABILIZADO</Text>
                                </th>
                                <th colSpan={2} className="py-1 px-2 h-[30px] min-h-[30px] max-h-[30px] border-r border-b border-white/20 bg-[#002060] text-center shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">
                                    <Text variant="caption" weight="bold" className="text-white text-[11px] leading-none">EN CANJE</Text>
                                </th>
                                <th colSpan={2} className="py-1 px-2 h-[30px] min-h-[30px] max-h-[30px] border-r border-b border-white/20 bg-[#002060] text-center shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">
                                    <Text variant="caption" weight="bold" className="text-white text-[11px] leading-none">PENDIENTES</Text>
                                </th>
                                <th rowSpan={2} className="p-3 h-[60px] border-r border-b border-white/20 bg-[#002060] text-center shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">
                                    <Text variant="caption" weight="bold" className="text-white text-[11px]">SALDO</Text>
                                </th>
                                <th rowSpan={2} className="p-3 h-[60px] border-b border-white/20 bg-[#002060] text-left shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">
                                    <Text variant="caption" weight="bold" className="text-white text-[11px]">OBSERVACIONES</Text>
                                </th>
                            </tr>
                            <tr className="bg-[#002060] h-[30px]">
                                <th className="py-1 px-2 h-[30px] min-h-[30px] max-h-[30px] border-r border-b border-white/20 bg-[#002060] text-[10px] text-white/90 text-center font-bold uppercase leading-none align-middle shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">Consignación</th>
                                <th className="py-1 px-2 h-[30px] min-h-[30px] max-h-[30px] border-r border-b border-white/20 bg-[#002060] text-[10px] text-white/90 text-center font-bold uppercase leading-none align-middle shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">Legalización</th>
                                <th className="py-1 px-2 h-[30px] min-h-[30px] max-h-[30px] border-r border-b border-white/20 bg-[#002060] text-[10px] text-white/90 text-center font-bold uppercase leading-none align-middle shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">Consignación</th>
                                <th className="py-1 px-2 h-[30px] min-h-[30px] max-h-[30px] border-r border-b border-white/20 bg-[#002060] text-[10px] text-white/90 text-center font-bold uppercase leading-none align-middle shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">Legalización</th>
                                <th className="py-1 px-2 h-[30px] min-h-[30px] max-h-[30px] border-r border-b border-white/20 bg-[#002060] text-[10px] text-white/90 text-center font-bold uppercase leading-none align-middle shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">Consignación</th>
                                <th className="py-1 px-2 h-[30px] min-h-[30px] max-h-[30px] border-r border-b border-white/20 bg-[#002060] text-[10px] text-white/90 text-center font-bold uppercase leading-none align-middle shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">Legalización</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-300">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Spinner size="lg" />
                                            <Text color="text-secondary" weight="medium">Consultando movimientos en ERP...</Text>
                                        </div>
                                    </td>
                                </tr>
                            ) : movimientos.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-12 text-center">
                                        <Text color="text-secondary" weight="medium">No se encontraron movimientos registrados.</Text>
                                    </td>
                                </tr>
                            ) : movimientos.map((mov: Movimiento, i: number) => (
                                <tr key={i} className="hover:bg-blue-100 transition-colors group border-b border-neutral-300">
                                    <td className="p-3 border-r border-b border-neutral-300 whitespace-nowrap text-center bg-white group-hover:bg-transparent transition-colors">
                                        <Text variant="caption" weight="medium" color="inherit" className="text-[#374151]">{new Date(mov.fechaaplicacion).toLocaleDateString('es-CO')}</Text>
                                    </td>
                                    <td className="p-3 border-r border-b border-neutral-300 bg-white group-hover:bg-transparent transition-colors whitespace-nowrap">
                                        <Text variant="caption" weight="bold" color="inherit" className="text-[#1f2937]">{mov.radicado}</Text>
                                    </td>
                                    <td className="p-3 text-right border-r border-b border-neutral-300 font-mono text-[12px] text-[#4b5563] group-hover:bg-transparent">
                                        {mov.consignacion_contabilizado > 0 ? `$${mov.consignacion_contabilizado.toLocaleString()}` : ''}
                                    </td>
                                    <td className="p-3 text-right border-r border-b border-neutral-300 font-mono text-[12px] text-[#4b5563] group-hover:bg-transparent">
                                        {mov.legalizacion_contabilizado > 0 ? `$${mov.legalizacion_contabilizado.toLocaleString()}` : ''}
                                    </td>
                                    <td className="p-3 text-right border-r border-b border-neutral-300 font-mono text-[12px] text-[#2563eb] group-hover:bg-transparent">
                                        {mov.consignacion_firmadas > 0 ? `$${mov.consignacion_firmadas.toLocaleString()}` : ''}
                                    </td>
                                    <td className="p-3 text-right border-r border-b border-neutral-300 font-mono text-[12px] text-[#2563eb] group-hover:bg-transparent">
                                        {mov.legalizacion_firmadas > 0 ? `$${mov.legalizacion_firmadas.toLocaleString()}` : ''}
                                    </td>
                                    <td className="p-3 text-right border-r border-b border-neutral-300 font-mono text-[12px] text-[#d97706] group-hover:bg-transparent">
                                        {mov.consignacion_pendientes > 0 ? `$${mov.consignacion_pendientes.toLocaleString()}` : ''}
                                    </td>
                                    <td className="p-3 text-right border-r border-b border-neutral-300 font-mono text-[12px] text-[#d97706] group-hover:bg-transparent font-medium">
                                        {mov.legalizacion_pendientes > 0 ? `$${mov.legalizacion_pendientes.toLocaleString()}` : ''}
                                    </td>
                                    <td className="p-3 text-right border-r border-b border-neutral-300 font-mono text-[12px] font-bold text-[#111827] bg-[#f9fafb] group-hover:bg-blue-100/20">
                                        ${mov.saldo.toLocaleString()}
                                    </td>
                                    <td className="p-3 min-w-[300px] border-b border-neutral-300 bg-white group-hover:bg-transparent transition-colors">
                                        <Text variant="caption" color="inherit" className="text-[#6b7280] uppercase leading-relaxed italic">
                                            {mov.observaciones || 'Sin observaciones'}
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
