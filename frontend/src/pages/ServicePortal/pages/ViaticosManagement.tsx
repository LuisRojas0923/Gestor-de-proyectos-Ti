import { ClipboardList, ShieldCheck } from 'lucide-react';
import { Button, Text, Title } from '../../../components/atoms';
import { ActionCard } from '../../../components/molecules';
import { useAppContext } from '../../../context/AppContext';
import ViaticosAuthModal from '../components/ViaticosAuthModal';

import imgIngresar from '../../../assets/images/categories/Ingresar Reporte.png';
import imgEstadoCuenta from '../../../assets/images/categories/estado de cuenta.png';

interface ViaticosManagementProps {
    onNavigate: (view: 'legalizar_gastos' | 'viaticos_reportes' | 'viaticos_estado' | 'director_legalizaciones') => void;
    moduleStatus?: Record<string, boolean>;
}

const ViaticosManagement: React.FC<ViaticosManagementProps> = ({ onNavigate, moduleStatus = {} }) => {
    const { state, dispatch } = useAppContext();
    const { user, isViaticosVerified } = state;
    const userRole = ((user as any)?.rol || user?.role || '').toLowerCase();
    const permissions = (user as any)?.permissions || [];
    const isAdmin = ['admin', 'director', 'manager'].includes(userRole);

    // Lógicas de visibilidad granular (RBAC + Master Switch Global + Viaticante)
    const isViaticante = user?.viaticante === true;
    const hasGestionPermission = (permissions.includes('viaticos_gestion') || isAdmin || isViaticante) && moduleStatus['viaticos_gestion'] !== false;
    const canSeeReportes = (permissions.includes('viaticos_reportes') || isAdmin || isViaticante) && moduleStatus['viaticos_reportes'] !== false;
    const canSeeEstado = (permissions.includes('viaticos_estado') || isAdmin || isViaticante) && moduleStatus['viaticos_estado'] !== false;
    const canSeeDirectorPanel = (permissions.includes('viaticos_director_panel') || isAdmin) && moduleStatus['viaticos_director_panel'] !== false;

    if (!isViaticosVerified && user) {
        return (
            <ViaticosAuthModal
                cedula={user.cedula}
                onVerified={() => {
                    dispatch({ type: 'SET_VIATICOS_VERIFIED', payload: true });
                    // Actualizar el estado del usuario para reflejar que ya configuró su contraseña
                    if (user) {
                        dispatch({ 
                            type: 'SET_USER', 
                            payload: { ...user, password_set: true } 
                        });
                    }
                }}
                onBack={() => navigate('/service-portal/inicio')}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Title variant="h4" weight="bold" color="text-primary" className="uppercase tracking-tight">
                    Gestión de Viáticos
                </Title>
                <div className="w-20"></div>
            </div>

            {/* Mensaje Informativo si es viaticante pero no tiene permiso administrativo */}
            {!hasGestionPermission && user?.viaticante && (
                <div className="max-w-[var(--portal-max-width)] mx-auto mt-6 p-6 rounded-[2rem] bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200/50 dark:border-amber-800/30 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shrink-0">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <Title variant="h5" weight="bold" className="text-amber-900 dark:text-amber-100">
                                Acceso Restringido por Administración
                            </Title>
                            <Text variant="body1" className="text-amber-800/80 dark:text-amber-200/60 leading-relaxed">
                                Hemos validado tu identidad correctamente. Sin embargo, tu acceso a los módulos funcionales de viáticos
                                (Legalización y Estado de Cuenta) está actualmente **restringido** por la administración del sistema.
                                <br />
                                <Text variant="caption" weight="semibold" className="opacity-70 block">Por favor contacta al área administrativa si crees que esto es un error.</Text>
                            </Text>
                        </div>
                    </div>
                </div>
            )}

            <div className={`grid grid-cols-1 ${['director', 'admin'].includes(userRole) ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-8 mt-8 max-w-[var(--portal-max-width)] mx-auto`}>
                {hasGestionPermission && (
                    <>
                        {canSeeReportes && (
                            <ActionCard
                                title="Legalizacion de Gastos"
                                description="Registra y legaliza tus viáticos, adjuntando facturas y detalles por OT."
                                icon={<img src={imgIngresar} alt="Legalizacion de Gastos" className="w-full h-full object-contain p-2" />}
                                onClick={() => onNavigate('viaticos_reportes')}
                                className="md:h-64"
                            />
                        )}

                        {canSeeEstado && (
                            <ActionCard
                                title="Estado de Cuenta"
                                description="Consulta tus movimientos, saldos y el histórico oficial desde el ERP."
                                icon={<img src={imgEstadoCuenta} alt="Estado de Cuenta" className="w-full h-full object-contain p-2" />}
                                onClick={() => onNavigate('viaticos_estado')}
                                className="md:h-64"
                            />
                        )}
                    </>
                )}

                {canSeeDirectorPanel && (
                    <ActionCard
                        title="Panel de Legalizaciones"
                        description="Consulta todas las legalizaciones reportadas y el flujo de información."
                        icon={<div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 mb-4 bg-purple-500/10"><ClipboardList className="w-12 h-12 text-purple-500" /></div>}
                        onClick={() => onNavigate('director_legalizaciones')}
                        className="md:h-64"
                    />
                )}
            </div>
        </div>
    );
};

export default ViaticosManagement;
