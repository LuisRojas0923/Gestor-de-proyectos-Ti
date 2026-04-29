import { ActionCard } from '../../../components/molecules';
import { Title, Text } from '../../../components/atoms';
import { FileText, Bot, Sparkles, ArrowRight } from 'lucide-react';
import imgSolicitar from '../../../assets/images/categories/Solicitar Servicio.png';
import imgGestionViaticos from '../../../assets/images/categories/gestion_viaticos.png';
import imgReunion from '../../../assets/images/categories/Reunion.png';
import sistemasolicitudes from '../../../assets/images/categories/logistico.png';
import imgInventario from '../../../assets/images/categories/Consultar Reportes.png';
import { useState } from 'react';
import AIChatAssistant from '../components/AIChatAssistant';

interface DashboardViewProps {
    user: any;
    moduleStatus: Record<string, boolean>;
    onNavigate: (view: 'categories' | 'status' | 'legalizar_gastos' | 'viaticos_gestion' | 'viaticos_estado' | 'reserva_salas' | 'requisiciones' | 'inventario' | 'contabilidad') => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, moduleStatus, onNavigate }) => {
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const userRole = (user?.rol || user?.role || '').toLowerCase();
    const permissions = user?.permissions || [];

    // Lógica de visibilidad por tarjeta (RBAC + Estado Global)
    const canSeeSolicitudes = moduleStatus['mis_solicitudes'] !== false && (
        permissions.includes('mis_solicitudes') ||
        permissions.includes('sistemas') ||
        permissions.includes('mejoramiento') ||
        permissions.includes('desarrollo') ||
        permissions.includes('desarrollo') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeRequisiciones = moduleStatus['requisiciones'] !== false && (
        permissions.includes('requisiciones') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeReservaSalas = moduleStatus['reserva_salas'] !== false && (
        permissions.includes('reserva_salas') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeViaticos = moduleStatus['viaticos_gestion'] !== false && (
        permissions.includes('viaticos_gestion') ||
        user?.viaticante === true ||
        ['admin', 'director', 'manager'].includes(userRole)
    );

    const canSeeInventario = moduleStatus['inventario_2026'] !== false && (
        permissions.includes('inventario_2026') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeContabilidad = moduleStatus['contabilidad'] !== false; // Visible para todos si está activo

    return (
        <div className="space-y-12 py-6">
            <div className="text-center space-y-2">
                <Title variant="h3" weight="bold" className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] bg-clip-text text-transparent">
                    ¿En qué podemos ayudarte hoy?
                </Title>
                <Text variant="h6" color="text-secondary" weight="medium">Selecciona una de las opciones principales de gestión</Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Asistente IA - Tarjeta Destacada */}
                <div className="md:col-span-2 lg:col-span-3 mb-4">
                    <div 
                        onClick={() => setIsAIChatOpen(true)}
                        className="group relative overflow-hidden bg-gradient-to-r from-emerald-900 via-blue-900 to-indigo-950 p-8 rounded-[2.5rem] shadow-2xl border border-white/10 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] hover:shadow-emerald-500/10"
                    >
                        {/* Decoración de fondo */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-emerald-500/20 transition-colors" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-10 -mb-10 group-hover:bg-blue-500/20 transition-colors" />
                        
                        <div className="relative flex flex-col md:flex-row items-center gap-8">
                            <div className="shrink-0 p-5 bg-white/10 rounded-[2rem] backdrop-blur-xl border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <Bot size={48} className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                            </div>
                            
                            <div className="flex-1 text-center md:text-left space-y-3">
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <Sparkles size={16} className="text-emerald-400" />
                                    <Text variant="caption" color="white" className="uppercase tracking-[0.3em] font-bold opacity-70">Nueva Experiencia Zero UI</Text>
                                </div>
                                <Title variant="h3" color="white" className="tracking-tight italic font-black">Asistente Inteligente</Title>
                                <Text variant="body1" color="white" className="opacity-80 max-w-xl">
                                    ¿Problemas técnicos? No llenes formularios. Cuéntame qué sucede en lenguaje natural y yo crearé el ticket por ti en segundos.
                                </Text>
                            </div>
                            
                            <div className="shrink-0">
                                <div className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-3">
                                    INICIAR CHAT
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {canSeeSolicitudes && (
                    <ActionCard
                        title="Gestión de Solicitudes TI"
                        description="Crea nuevos requerimientos o consulta el estado de tus tickets actuales."
                        icon={<img src={imgSolicitar} alt="Solicitar Servicio" className="w-full h-full object-contain p-2" />}
                        onClick={() => onNavigate('categories')}
                    />
                )}

                {canSeeReservaSalas && (
                    <ActionCard
                        title="Reserva de salas"
                        description="Reserva salas de reuniones y espacios para tu equipo."
                        icon={<img src={imgReunion} alt="Reserva de salas" className="w-full h-full object-contain p-2" />}
                        onClick={() => onNavigate('reserva_salas')}
                    />
                )}

                {canSeeRequisiciones && (
                    <ActionCard
                        title="Sistema de Solicitudes"
                        description="Gestión de Requisiciones (Almacén, Suministros, Presupuesto)."
                        icon={<img src={sistemasolicitudes} alt="Sistema de Solicitudes" className="w-full h-full object-contain p-2" />}
                        onClick={() => onNavigate('requisiciones')}
                    />
                )}

                {canSeeViaticos && (
                    <ActionCard
                        title="Gestión de Viáticos"
                        description="Reporte de gastos y consulta de estado de cuenta detallado."
                        icon={<img src={imgGestionViaticos} alt="Gestión de Viáticos" className="w-full h-full object-contain p-2" />}
                        onClick={() => onNavigate('viaticos_gestion')}
                    />
                )}

                {canSeeInventario && (
                    <ActionCard
                        title="Inventario 2026"
                        description="Toma física de inventario y carga masiva de conteos."
                        icon={<img src={imgInventario} alt="Inventario 2026" className="w-full h-full object-contain p-2" />}
                        onClick={() => onNavigate('inventario')}
                    />
                )}

                {canSeeContabilidad && (
                    <ActionCard
                        title="Gestión Humana"
                        description="Certificados laborales, desprendibles de pago e información tributaria."
                        icon={<FileText className="w-10 h-10 text-primary-600" />}
                        onClick={() => onNavigate('contabilidad')}
                    />
                )}
            </div>

            <AIChatAssistant 
                isOpen={isAIChatOpen} 
                onClose={() => setIsAIChatOpen(false)}
                onTicketCreated={(id) => {
                    // Opcional: navegar al ticket o refrescar
                    console.log("Ticket creado via IA:", id);
                }}
            />
        </div>
    );
};

export default DashboardView;
