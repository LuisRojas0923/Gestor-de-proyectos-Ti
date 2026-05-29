import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, MaterialCard } from '../../../components/atoms';
import {
    FileText, Briefcase, ChevronRight, Users, Settings, UserCheck,
    PenTool, Database, ChevronDown, ChevronUp
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

interface SubItem {
    label: string;
    onClick: () => void;
}

const ServicePortalCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick?: () => void;
    subItems?: SubItem[];
    expanded?: boolean;
    onToggleExpand?: () => void;
}> = ({ title, description, icon, onClick, subItems, expanded = false, onToggleExpand }) => {
    const hasSubItems = subItems && subItems.length > 0;

    return (
        <div className="flex flex-col w-full group">
            <MaterialCard
                onClick={hasSubItems ? onToggleExpand : onClick}
                hoverable={true}
                className={`p-4 bg-white dark:bg-neutral-800/85 border border-slate-200 dark:border-neutral-700/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-350 text-left w-full h-auto cursor-pointer flex flex-col justify-center ${
                    expanded ? 'ring-2 ring-[var(--color-primary)]/20 !border-[var(--color-primary)] shadow-md bg-slate-50/20 dark:bg-neutral-800' : ''
                }`}
            >
                <div className="flex items-center gap-4 w-full">
                    {/* Contenedor del Icono/Logo */}
                    <div className="w-14 h-14 bg-slate-50 dark:bg-neutral-900 rounded-xl flex items-center justify-center p-2 border border-slate-100 dark:border-neutral-850 shadow-sm shrink-0">
                        <div className="w-full h-full flex items-center justify-center">
                            {icon}
                        </div>
                    </div>
                    {/* Textos */}
                    <div className="flex-grow min-w-0">
                        <Title variant="h6" weight="bold" className="truncate leading-tight text-slate-800 dark:text-white group-hover:text-[var(--color-primary)] transition-colors">
                            {title}
                        </Title>
                        <Text variant="caption" className="block mt-1 font-medium text-slate-500 dark:text-slate-400 line-clamp-2">
                            {description}
                        </Text>
                        
                        {/* Selector de sub-rutas */}
                        {hasSubItems && (
                            <div className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <span>{subItems.length} opciones disponibles</span>
                                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </div>
                        )}
                    </div>
                    {/* Indicador de Acción */}
                    {!hasSubItems ? (
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
                    ) : (
                        <div className="shrink-0 p-1.5 rounded-full bg-slate-50 dark:bg-neutral-900 group-hover:bg-slate-100 dark:group-hover:bg-neutral-800 transition-colors">
                            {expanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            )}
                        </div>
                    )}
                </div>
            </MaterialCard>

            {/* Sub-paneles colapsables */}
            {hasSubItems && expanded && (
                <div className="mt-2 mx-1 p-2 bg-slate-50/50 dark:bg-neutral-900/35 border border-slate-200/50 dark:border-neutral-800/85 rounded-2xl space-y-1 animate-in slide-in-from-top-1.5 duration-200">
                    {subItems.map((sub, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                sub.onClick();
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-750 border border-slate-100 dark:border-neutral-750/70 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all duration-150 shadow-sm hover:translate-x-0.5"
                        >
                            <span>{sub.label}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const DashboardView: React.FC<DashboardViewProps> = ({ user, moduleStatus, onNavigate }) => {
    const navigate = useNavigate();
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    const userRole = (user?.rol || user?.role || '').toLowerCase();
    const permissions: string[] = user?.permissions || [];

    const toggleCard = (cardName: string) => {
        setExpandedCard(prev => (prev === cardName ? null : cardName));
    };

    // Subitems para tarjetas complejas
    const solicitudesSubItems: SubItem[] = [
        { label: 'Crear Solicitud de Soporte TI', onClick: () => onNavigate('categories') },
        { label: 'Mis Tickets / Consultar Estado', onClick: () => onNavigate('status') }
    ];

    const viaticosSubItems: SubItem[] = [
        { label: 'Legalizar Gastos / Nuevo Reporte', onClick: () => navigate('/service-portal/gastos/nuevo', { state: { newReport: true } }) },
        { label: 'Historial de Legalizaciones (Reportes)', onClick: () => onNavigate('viaticos_gestion') },
        { label: 'Consultar Estado de Cuenta', onClick: () => onNavigate('viaticos_estado') }
    ];
    if (permissions.includes('viaticos_director_panel') || ['admin', 'director'].includes(userRole)) {
        viaticosSubItems.push({
            label: 'Bandeja de Aprobación de Subalternos',
            onClick: () => navigate('/service-portal/gastos/director')
        });
    }

    const requisicionesSubItems: SubItem[] = [
        { label: 'Portal General de Requisiciones', onClick: () => onNavigate('requisiciones') },
        { label: 'Solicitar Artículos a Almacén', onClick: () => navigate('/service-portal/requisiciones/almacen') },
        { label: 'Mis Solicitudes de Almacén', onClick: () => navigate('/service-portal/requisiciones/mis-solicitudes') }
    ];

    const reqPersonalSubItems: SubItem[] = [
        { label: 'Bandeja Principal de Requisiciones', onClick: () => onNavigate('requisicion_personal') },
        { label: 'Crear Nueva Requisición de Personal', onClick: () => navigate('/service-portal/requisicion-personal/crear') }
    ];

    const actividadesSubItems: SubItem[] = [
        { label: 'Panel de Mis Desarrollos', onClick: () => navigate('/service-portal/desarrollos') },
        { label: 'Aprobaciones de Asignación', onClick: () => navigate('/service-portal/validaciones-asignacion') },
        { label: 'Jerarquía Organizacional', onClick: () => navigate('/service-portal/jerarquia-organizacional') }
    ];

    const nominaSubItems: SubItem[] = [
        { label: 'Control de Descuentos', onClick: () => navigate('/service-portal/novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS') },
        { label: 'Descuento por Celulares', onClick: () => navigate('/service-portal/novedades-nomina/DESCUENTOS/CELULARES') },
        { label: 'Descuento por Retenciones', onClick: () => navigate('/service-portal/novedades-nomina/DESCUENTOS/RETENCIONES') },
        { label: 'Descuento por Embargos', onClick: () => navigate('/service-portal/novedades-nomina/DESCUENTOS/EMBARGOS') },
        { label: 'Libranza Banco de Bogotá', onClick: () => navigate('/service-portal/novedades-nomina/LIBRANZAS/BOGOTA LIBRANZA') },
        { label: 'Libranza Davivienda', onClick: () => navigate('/service-portal/novedades-nomina/LIBRANZAS/DAVIVIENDA LIBRANZA') },
        { label: 'Libranza Banco de Occidente', onClick: () => navigate('/service-portal/novedades-nomina/LIBRANZAS/OCCIDENTE LIBRANZA') },
        { label: 'Cooperativa Grancoop', onClick: () => navigate('/service-portal/novedades-nomina/COOPERATIVAS/GRANCOOP') },
        { label: 'Cooperativa Beneficiar', onClick: () => navigate('/service-portal/novedades-nomina/COOPERATIVAS/BENEFICIAR') },
        { label: 'Seguros HDI', onClick: () => navigate('/service-portal/novedades-nomina/OTROS/SEGUROS HDI') },
        { label: 'Funeraria Camposanto', onClick: () => navigate('/service-portal/novedades-nomina/FUNEBRES/CAMPOSANTO') },
        { label: 'Funeraria Recordar', onClick: () => navigate('/service-portal/novedades-nomina/FUNEBRES/RECORDAR') },
        { label: 'Pólizas de Vehículos', onClick: () => navigate('/service-portal/novedades-nomina/OTROS/POLIZAS VEHICULOS') },
        { label: 'Medicina Prepagada', onClick: () => navigate('/service-portal/novedades-nomina/OTROS/MEDICINA PREPAGADA') },
        { label: 'Otros Conceptos Gerencia', onClick: () => navigate('/service-portal/novedades-nomina/OTROS/OTROS GERENCIA') },
        { label: 'Gestión de Excepciones', onClick: () => navigate('/service-portal/novedades-nomina/OTROS/GESTION EXCEPCIONES') },
        { label: 'Planillas Regionales 1Q', onClick: () => navigate('/service-portal/novedades-nomina/NOVEDADES/PLANILLAS REGIONALES 1Q') },
        { label: 'Planillas Regionales 2Q', onClick: () => navigate('/service-portal/novedades-nomina/NOVEDADES/PLANILLAS REGIONALES 2Q') },
        { label: 'Tabla Maestra de Novedades', onClick: () => navigate('/service-portal/novedades-nomina/tabla-maestra') },
        { label: 'Historial de Cargas', onClick: () => navigate('/service-portal/novedades-nomina/historial') },
        { label: 'Resumen Consolidado', onClick: () => navigate('/service-portal/novedades-nomina/resumen') }
    ];

    // Permisos
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

    // Construcción de la lista ordenada de tarjetas
    const cards: React.ReactNode[] = [];

    if (canSeeSolicitudes) {
        cards.push(
            <ServicePortalCard
                key="solicitudes"
                title="Gestión de Solicitudes TI"
                description="Crea nuevos requerimientos o consulta el estado de tus tickets actuales."
                icon={<img src={imgSolicitar} alt="Solicitar Servicio" className="w-full h-full object-contain p-1" />}
                subItems={solicitudesSubItems}
                expanded={expandedCard === 'Gestión de Solicitudes TI'}
                onToggleExpand={() => toggleCard('Gestión de Solicitudes TI')}
            />
        );
    }

    if (canSeeReservaSalas) {
        cards.push(
            <ServicePortalCard
                key="reserva_salas"
                title="Reserva de salas"
                description="Reserva salas de reuniones y espacios para tu equipo."
                icon={<img src={imgReunion} alt="Reserva de salas" className="w-full h-full object-contain p-1" />}
                onClick={() => onNavigate('reserva_salas')}
            />
        );
    }

    if (canSeeRequisiciones) {
        cards.push(
            <ServicePortalCard
                key="requisiciones"
                title="Sistema de Solicitudes"
                description="Gestión de Requisiciones (Almacén, Suministros, Presupuesto)."
                icon={<img src={sistemasolicitudes} alt="Sistema de Solicitudes" className="w-full h-full object-contain p-1" />}
                subItems={requisicionesSubItems}
                expanded={expandedCard === 'Sistema de Solicitudes'}
                onToggleExpand={() => toggleCard('Sistema de Solicitudes')}
            />
        );
    }

    if (canSeeViaticos) {
        cards.push(
            <ServicePortalCard
                key="viaticos"
                title="Gestión de Viáticos"
                description="Reporte de gastos y consulta de estado de cuenta detallado."
                icon={<img src={imgGestionViaticos} alt="Gestión de Viáticos" className="w-full h-full object-contain p-1" />}
                subItems={viaticosSubItems}
                expanded={expandedCard === 'Gestión de Viáticos'}
                onToggleExpand={() => toggleCard('Gestión de Viáticos')}
            />
        );
    }

    if (canSeeNomina) {
        cards.push(
            <ServicePortalCard
                key="nomina"
                title="Novedades de Nómina"
                description="Carga y procesamiento de novedades para SOLID."
                icon={<img src={imgNovedadesNomina} alt="Novedades de Nómina" className="w-full h-full object-contain p-1" />}
                subItems={nominaSubItems}
                expanded={expandedCard === 'Novedades de Nómina'}
                onToggleExpand={() => toggleCard('Novedades de Nómina')}
            />
        );
    }

    if (canSeeComisiones) {
        cards.push(
            <ServicePortalCard
                key="comisiones"
                title="Comisiones"
                description="Cálculo y procesamiento de comisiones para el personal."
                icon={<img src={imgComisiones} alt="Gestión de Comisiones" className="w-full h-full object-contain p-1" />}
                onClick={() => onNavigate('comisiones')}
            />
        );
    }
    
    if (canSeeInventario) {
        cards.push(
            <ServicePortalCard
                key="inventario"
                title="Inventario 2026"
                description="Toma física de inventario y carga masiva de conteos."
                icon={<img src={imgInventario} alt="Inventario 2026" className="w-full h-full object-contain p-1" />}
                onClick={() => onNavigate('inventario')}
            />
        );
    }

    if (canSeeRequisicionPersonal) {
        cards.push(
            <ServicePortalCard
                key="requisicion_personal"
                title="Requisición de Personal"
                description="Creación y seguimiento de solicitudes de contratación de personal."
                icon={<Users className="w-8 h-8 text-[var(--color-primary)]" />}
                subItems={reqPersonalSubItems}
                expanded={expandedCard === 'Requisición de Personal'}
                onToggleExpand={() => toggleCard('Requisición de Personal')}
            />
        );
    }

    if (canSeeSeguimientoRPGH) {
        cards.push(
            <ServicePortalCard
                key="seguimiento_rp_gh"
                title="Seguimiento RP Gestión Humana"
                description="Gestión y seguimiento del proceso de selección y contratación de requisiciones aprobadas."
                icon={<UserCheck className="w-8 h-8 text-[var(--color-primary)]" />}
                onClick={() => onNavigate('seguimiento_rp_gh')}
            />
        );
    }

    if (canSeeAprobacionGerenciaRP) {
        cards.push(
            <ServicePortalCard
                key="aprobacion_rp_gerencia"
                title="Aprobación Gerencial RP"
                description="Firma y autorización definitiva de requisiciones de personal aprobadas por directores."
                icon={<PenTool className="w-8 h-8 text-[var(--color-primary)]" />}
                onClick={() => onNavigate('aprobacion_rp_gerencia')}
            />
        );
    }

    if (canSeePerfilesCargo) {
        cards.push(
            <ServicePortalCard
                key="perfiles_cargo"
                title="Perfiles de Cargo"
                description="Administración de áreas, cargos y sus relaciones de reporte jerárquico."
                icon={<Settings className="w-8 h-8 text-[var(--color-primary)]" />}
                onClick={() => onNavigate('perfiles_cargo')}
            />
        );
    }

    if (canSeeContabilidad) {
        cards.push(
            <ServicePortalCard
                key="contabilidad"
                title="Gestión Humana"
                description="Certificados laborales, desprendibles de pago e información tributaria."
                icon={<FileText className="w-8 h-8 text-[var(--color-primary)]" />}
                onClick={() => onNavigate('contabilidad')}
            />
        );
    }

    if (canSeeGestionActividades) {
        cards.push(
            <ServicePortalCard
                key="gestion_actividades"
                title="Gestión de Actividades"
                description="Accede a desarrollos, aprobaciones y jerarquía organizacional."
                icon={<Briefcase className="w-8 h-8 text-[var(--color-primary)]" />}
                subItems={actividadesSubItems}
                expanded={expandedCard === 'Gestión de Actividades'}
                onToggleExpand={() => toggleCard('Gestión de Actividades')}
            />
        );
    }

    if (canSeeCentroCostos) {
        cards.push(
            <ServicePortalCard
                key="centro_costos"
                title="Configuración Centros de Costos"
                description="Configure los catálogos maestros de UENs, Subcentros de Costo y Especialidades del ERP."
                icon={<Database className="w-8 h-8 text-[var(--color-primary)]" />}
                onClick={() => onNavigate('centro_costos')}
            />
        );
    }

    return (
        <div className="space-y-12 py-6">
            <div className="text-center space-y-2">
                <Title variant="h3" weight="bold" className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] bg-clip-text text-transparent">
                    ¿En qué podemos ayudarte hoy?
                </Title>
                <Text variant="h6" color="text-secondary" weight="medium">Selecciona una de las opciones principales de gestión</Text>
            </div>

            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 w-full [column-fill:_balance]">
                {cards.map((card, idx) => (
                    <div key={idx} className="break-inside-avoid mb-6 w-full">
                        {card}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DashboardView;
