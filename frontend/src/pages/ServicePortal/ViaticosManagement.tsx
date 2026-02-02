import { ArrowLeft } from 'lucide-react';
import { Button, Text, Title } from '../../components/atoms';
import { ActionCard } from '../../components/molecules';

import imgIngresar from '../../assets/images/categories/Ingresar Reporte.png';
import imgConsultar from '../../assets/images/categories/Consultar Reportes.png';
import imgEstadoCuenta from '../../assets/images/categories/estado de cuenta.png';

interface ViaticosManagementProps {
    onNavigate: (view: 'legalizar_gastos' | 'viaticos_reportes' | 'viaticos_estado') => void;
    onBack: () => void;
}

const ViaticosManagement: React.FC<ViaticosManagementProps> = ({ onNavigate, onBack }) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 px-0 hover:bg-transparent transition-colors">
                    <ArrowLeft size={20} />
                    <Text weight="medium">Volver al Dashboard</Text>
                </Button>
                <Title variant="h4" weight="bold" color="text-primary" className="uppercase tracking-tight">
                    Gestión de Viáticos
                </Title>
                <div className="w-20"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                <ActionCard
                    title="Ingresar Reporte"
                    description="Registra y legaliza tus viáticos, adjuntando facturas y detalles por OT."
                    icon={<img src={imgIngresar} alt="Ingresar Reporte" className="w-full h-full object-contain p-2" />}
                    onClick={() => onNavigate('legalizar_gastos')}
                />

                <ActionCard
                    title="Consultar Reportes"
                    description="Mira el estado de los reportes que has enviado y que están en tránsito de aprobación."
                    icon={<img src={imgConsultar} alt="Consultar Reportes" className="w-full h-full object-contain p-2" />}
                    onClick={() => onNavigate('viaticos_reportes')}
                    variant="primary_light"
                />

                <ActionCard
                    title="Estado de Cuenta"
                    description="Consulta tus movimientos, saldos y el histórico oficial desde el ERP."
                    icon={<img src={imgEstadoCuenta} alt="Estado de Cuenta" className="w-full h-full object-contain p-2" />}
                    onClick={() => onNavigate('viaticos_estado')}
                />
            </div>
        </div>
    );
};

export default ViaticosManagement;
