import {
    ArrowLeft,
    FileText,
    History,
    Search
} from 'lucide-react';
import {
    Button,
    Text,
    Title,
    MaterialCard
} from '../../components/atoms';

interface ViaticosManagementProps {
    onNavigate: (view: 'legalizar_gastos' | 'viaticos_reportes' | 'viaticos_estado') => void;
    onBack: () => void;
}

const ViaticosManagement: React.FC<ViaticosManagementProps> = ({ onNavigate, onBack }) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 px-0 hover:bg-transparent">
                    <ArrowLeft size={20} />
                    <Text weight="medium">Volver al Dashboard</Text>
                </Button>
                <Title variant="h4" weight="bold" color="text-primary">
                    Gestión de Viáticos
                </Title>
                <div className="w-20"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {/* 1. Ingresar Reporte */}
                <MaterialCard
                    className="p-8 cursor-pointer hover:scale-[1.02] transition-all bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-200 dark:border-blue-900/30 flex flex-col items-center text-center group"
                    onClick={() => onNavigate('legalizar_gastos')}
                >
                    <div className="bg-blue-500/20 p-5 rounded-3xl mb-6 group-hover:bg-blue-500/30 transition-colors">
                        <FileText className="text-blue-600 dark:text-blue-400" size={40} />
                    </div>
                    <Title variant="h3" className="mb-3">Ingresar Reporte</Title>
                    <Text color="text-secondary" className="max-w-[250px] text-sm leading-relaxed">
                        Registra y legaliza tus viáticos, adjuntando facturas y detalles por OT.
                    </Text>
                </MaterialCard>

                {/* 2. Consultar Reportes (NUEVO) */}
                <MaterialCard
                    className="p-8 cursor-pointer hover:scale-[1.02] transition-all bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-900/30 flex flex-col items-center text-center group"
                    onClick={() => onNavigate('viaticos_reportes')}
                >
                    <div className="bg-amber-500/20 p-5 rounded-3xl mb-6 group-hover:bg-amber-500/30 transition-colors">
                        <Search className="text-amber-600 dark:text-amber-400" size={40} />
                    </div>
                    <Title variant="h3" className="mb-3">Consultar Reportes</Title>
                    <Text color="text-secondary" className="max-w-[250px] text-sm leading-relaxed">
                        Mira el estado de los reportes que has enviado y que están en tránsito de aprobación.
                    </Text>
                </MaterialCard>

                {/* 3. Estado de Cuenta */}
                <MaterialCard
                    className="p-8 cursor-pointer hover:scale-[1.02] transition-all bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-900/30 flex flex-col items-center text-center group"
                    onClick={() => onNavigate('viaticos_estado')}
                >
                    <div className="bg-emerald-500/20 p-5 rounded-3xl mb-6 group-hover:bg-emerald-500/30 transition-colors">
                        <History className="text-emerald-600 dark:text-emerald-400" size={40} />
                    </div>
                    <Title variant="h3" className="mb-3">Estado de Cuenta</Title>
                    <Text color="text-secondary" className="max-w-[250px] text-sm leading-relaxed">
                        Consulta tus movimientos, saldos y el histórico oficial desde el ERP.
                    </Text>
                </MaterialCard>
            </div>
        </div>
    );
};

export default ViaticosManagement;
