import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Button, Text, Title } from '../../../components/atoms';
import { ActionCard } from '../../../components/molecules';
import { useAppContext } from '../../../context/AppContext';
import ViaticosAuthModal from '../components/ViaticosAuthModal';

import imgIngresar from '../../../assets/images/categories/Ingresar Reporte.png';
import imgEstadoCuenta from '../../../assets/images/categories/estado de cuenta.png';

interface ViaticosManagementProps {
    onNavigate: (view: 'legalizar_gastos' | 'viaticos_reportes' | 'viaticos_estado' | 'director_legalizaciones') => void;
    onBack: () => void;
}

const ViaticosManagement: React.FC<ViaticosManagementProps> = ({ onNavigate, onBack }) => {
    const { state, dispatch } = useAppContext();
    const { user, isViaticosVerified } = state;
    const userRole = ((user as any)?.rol || user?.role || '').toLowerCase();

    if (!isViaticosVerified && user) {
        return (
            <ViaticosAuthModal
                cedula={user.cedula}
                onVerified={() => {
                    dispatch({ type: 'SET_VIATICOS_VERIFIED', payload: true });
                }}
                onBack={onBack}
            />
        );
    }
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-variant)] px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
                >
                    <ArrowLeft size={18} />
                    <Text weight="medium" className="text-base font-medium text-left text-[var(--color-text)] hidden sm:inline">
                        Volver
                    </Text>
                </Button>
                <Title variant="h4" weight="bold" color="text-primary" className="uppercase tracking-tight">
                    Gestión de Viáticos
                </Title>
                <div className="w-20"></div>
            </div>

            <div className={`grid grid-cols-1 ${['director', 'admin'].includes(userRole) ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-8 mt-8 max-w-5xl mx-auto`}>
                <ActionCard
                    title="Legalizacion de Gastos"
                    description="Registra y legaliza tus viáticos, adjuntando facturas y detalles por OT."
                    icon={<img src={imgIngresar} alt="Legalizacion de Gastos" className="w-full h-full object-contain p-2" />}
                    onClick={() => onNavigate('viaticos_reportes')}
                    className="md:h-64"
                />

                <ActionCard
                    title="Estado de Cuenta"
                    description="Consulta tus movimientos, saldos y el histórico oficial desde el ERP."
                    icon={<img src={imgEstadoCuenta} alt="Estado de Cuenta" className="w-full h-full object-contain p-2" />}
                    onClick={() => onNavigate('viaticos_estado')}
                    className="md:h-64"
                />

                {['director', 'admin'].includes(userRole) && (
                    <ActionCard
                        title="Panel de Legalizaciones"
                        description="Consulta todas las legalizaciones reportadas y el flujo de información."
                        icon={<ClipboardList size={40} />}
                        onClick={() => onNavigate('director_legalizaciones')}
                        className="md:h-64"
                    />
                )}
            </div>
        </div>
    );
};

export default ViaticosManagement;
