import React from 'react';
import { Title, Text, MaterialCard } from '../../../components/atoms';
import {
    FileText, Briefcase, ChevronRight, Users, Settings, UserCheck,
    PenTool, Database
} from 'lucide-react';
import imgSolicitar from '../../../assets/images/categories/Solicitar Servicio.png';
import imgGestionViaticos from '../../../assets/images/categories/gestion_viaticos.png';
import imgReunion from '../../../assets/images/categories/Reunion.png';
import sistemasolicitudes from '../../../assets/images/categories/logistico.png';
import imgInventario from '../../../assets/images/categories/Consultar Reportes.png';
import imgNovedadesNomina from '../../../assets/images/categories/NOVEDADES_NOMINA.png';
import imgComisiones from '../../../assets/images/categories/COMISIONES.png';

interface DashboardViewProps {
    user: any;
    moduleStatus: Record<string, boolean>;
    onNavigate: (view: 'categories' | 'status' | 'legalizar_gastos' | 'viaticos_gestion' | 'viaticos_estado' | 'reserva_salas' | 'requisiciones' | 'inventario' | 'nomina' | 'contabilidad' | 'gestion_actividades' | 'comisiones' | 'requisicion_personal' | 'seguimiento_rp_gh' | 'aprobacion_rp_gerencia' | 'perfiles_cargo' | 'centro_costos') => void;
}

const ServicePortalCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
}> = ({ title, description, icon, onClick }) => {
    return (
        <MaterialCard
            onClick={onClick}
            hoverable={true}
            className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm hover:shadow-lg hover:border-[var(--color-primary)] transition-all duration-300 transform hover:-translate-y-0.5 text-left w-full min-h-24 h-auto cursor-pointer"
        >
            <div className="flex items-center gap-4 w-full h-full">
                {/* Contenedor del Icono/Logo */}
                <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center p-2 border border-slate-100 dark:border-neutral-700 shadow-sm shrink-0">
                    <div className="w-full h-full flex items-center justify-center">
                        {icon}
                    </div>
                </div>
                {/* Textos */}
                <div className="flex-grow min-w-0">
                    <Title variant="h6" weight="bold" className="truncate leading-tight text-slate-800 dark:text-white transition-colors">
                        {title}
                    </Title>
                    <Text variant="caption" color="text-secondary" className="block mt-1 font-medium line-clamp-2">
                        {description}
                    </Text>
                </div>
                {/* Indicador de Acción */}
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
            </div>
        </MaterialCard>
    );
};

const DashboardView: React.FC<DashboardViewProps> = ({ user, moduleStatus, onNavigate }) => {
    const userRole = (user?.rol || user?.role || '').toLowerCase();
    const permissions: string[] = user?.permissions || [];

    const canSeeSolicitudes = moduleStatus['mis_solicitudes'] !== false && (
        permissions.includes('mis_solicitudes') ||
        permissions.includes('sistemas') ||
        permissions.includes('mejoramiento') ||
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
        ['admin', 'director'].includes(userRole)
    );

    const canSeeInventario = moduleStatus['inventario_2026'] !== false && (
        permissions.includes('inventario_2026') ||
        ['admin', 'director'].includes(userRole)
    );
    
    const canSeeNomina = moduleStatus['nomina_novedades'] !== false && (
        permissions.includes('nomina_novedades') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeContabilidad = moduleStatus['contabilidad'] !== false && (
        permissions.includes('gestion_humana') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeGestionActividades =
        permissions.includes('developments') ||
        permissions.includes('validaciones_asignacion') ||
        permissions.includes('jerarquia_organizacional') ||
        ['admin', 'director'].includes(userRole);

    const canSeeComisiones = moduleStatus['comisiones'] !== false && (
        permissions.includes('comisiones') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeRequisicionPersonal = moduleStatus['requisicion_personal'] !== false;

    const canSeeSeguimientoRPGH = moduleStatus['requisicion_personal'] !== false && (
        permissions.includes('gestion_humana') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeAprobacionGerenciaRP = moduleStatus['requisicion_personal'] !== false && (
        (user?.cedula || user?.id) === "66903320" ||
        userRole === "admin"
    );

    const canSeePerfilesCargo = moduleStatus['perfiles_cargo'] !== false && (
        permissions.includes('perfiles_cargo') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeCentroCostos = moduleStatus['configuracion_centro_costo'] !== false && (
        ['admin', 'admin_sistemas', 'admin_mejoramiento'].includes(userRole)
    );

    return (
        <div className="space-y-12 py-6">
            <div className="text-center space-y-2">
                <Title variant="h3" weight="bold" className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] bg-clip-text text-transparent">
                    ¿En qué podemos ayudarte hoy?
                </Title>
                <Text variant="h6" color="text-secondary" weight="medium">Selecciona una de las opciones principales de gestión</Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {canSeeSolicitudes && (
                    <ServicePortalCard
                        title="Gestión de Solicitudes TI"
                        description="Crea nuevos requerimientos o consulta el estado de tus tickets actuales."
                        icon={<img src={imgSolicitar} alt="Solicitar Servicio" className="w-full h-full object-contain p-1" />}
                        onClick={() => onNavigate('categories')}
                    />
                )}

                {canSeeReservaSalas && (
                    <ServicePortalCard
                        title="Reserva de salas"
                        description="Reserva salas de reuniones y espacios para tu equipo."
                        icon={<img src={imgReunion} alt="Reserva de salas" className="w-full h-full object-contain p-1" />}
                        onClick={() => onNavigate('reserva_salas')}
                    />
                )}

                {canSeeRequisiciones && (
                    <ServicePortalCard
                        title="Sistema de Solicitudes"
                        description="Gestión de Requisiciones (Almacén, Suministros, Presupuesto)."
                        icon={<img src={sistemasolicitudes} alt="Sistema de Solicitudes" className="w-full h-full object-contain p-1" />}
                        onClick={() => onNavigate('requisiciones')}
                    />
                )}

                {canSeeViaticos && (
                    <ServicePortalCard
                        title="Gestión de Viáticos"
                        description="Reporte de gastos y consulta de estado de cuenta detallado."
                        icon={<img src={imgGestionViaticos} alt="Gestión de Viáticos" className="w-full h-full object-contain p-1" />}
                        onClick={() => onNavigate('viaticos_gestion')}
                    />
                )}

                {canSeeNomina && (
                    <ServicePortalCard
                        title="Novedades de Nómina"
                        description="Carga y procesamiento de novedades para SOLID."
                        icon={<img src={imgNovedadesNomina} alt="Novedades de Nómina" className="w-full h-full object-contain p-1" />}
                        onClick={() => onNavigate('nomina')}
                    />
                )}

                {canSeeComisiones && (
                    <ServicePortalCard
                        title="Comisiones"
                        description="Cálculo y procesamiento de comisiones para el personal."
                        icon={<img src={imgComisiones} alt="Gestión de Comisiones" className="w-full h-full object-contain p-1" />}
                        onClick={() => onNavigate('comisiones')}
                    />
                )}
                
                {canSeeInventario && (
                    <ServicePortalCard
                        title="Inventario 2026"
                        description="Toma física de inventario y carga masiva de conteos."
                        icon={<img src={imgInventario} alt="Inventario 2026" className="w-full h-full object-contain p-1" />}
                        onClick={() => onNavigate('inventario')}
                    />
                )}

                {canSeeRequisicionPersonal && (
                    <ServicePortalCard
                        title="Requisición de Personal"
                        description="Creación y seguimiento de solicitudes de contratación de personal."
                        icon={<Users className="w-8 h-8 text-[var(--color-primary)]" />}
                        onClick={() => onNavigate('requisicion_personal')}
                    />
                )}

                {canSeeSeguimientoRPGH && (
                    <ServicePortalCard
                        title="Seguimiento RP Gestión Humana"
                        description="Gestión y seguimiento del proceso de selección y contratación de requisiciones aprobadas."
                        icon={<UserCheck className="w-8 h-8 text-[var(--color-primary)]" />}
                        onClick={() => onNavigate('seguimiento_rp_gh')}
                    />
                )}

                {canSeeAprobacionGerenciaRP && (
                    <ServicePortalCard
                        title="Aprobación Gerencial RP"
                        description="Firma y autorización definitiva de requisiciones de personal aprobadas por directores."
                        icon={<PenTool className="w-8 h-8 text-[var(--color-primary)]" />}
                        onClick={() => onNavigate('aprobacion_rp_gerencia')}
                    />
                )}

                {canSeePerfilesCargo && (
                    <ServicePortalCard
                        title="Perfiles de Cargo"
                        description="Administración de áreas, cargos y sus relaciones de reporte jerárquico."
                        icon={<Settings className="w-8 h-8 text-[var(--color-primary)]" />}
                        onClick={() => onNavigate('perfiles_cargo')}
                    />
                )}

                {canSeeCentroCostos && (
                    <ServicePortalCard
                        title="Configuración Centros de Costos"
                        description="Configure los catálogos maestros de UENs, Subcentros de Costo y Especialidades del ERP."
                        icon={<Database className="w-8 h-8 text-[var(--color-primary)]" />}
                        onClick={() => onNavigate('centro_costos')}
                    />
                )}

                {canSeeContabilidad && (
                    <ServicePortalCard
                        title="Gestión Humana"
                        description="Certificados laborales, desprendibles de pago e información tributaria."
                        icon={<FileText className="w-8 h-8 text-[var(--color-primary)]" />}
                        onClick={() => onNavigate('contabilidad')}
                    />
                )}

                {canSeeGestionActividades && (
                    <ServicePortalCard
                        title="Gestión de Actividades"
                        description="Accede a desarrollos, aprobaciones y jerarquía organizacional."
                        icon={<Briefcase className="w-8 h-8 text-[var(--color-primary)]" />}
                        onClick={() => onNavigate('gestion_actividades')}
                    />
                )}
            </div>
        </div>
    );
};

export default DashboardView;
