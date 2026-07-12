import React, { useState } from 'react';
import { Title, Text, Input } from '../../../components/atoms';
import ServiceCard from '../../../components/molecules/ServiceCard';
import { Activity, Briefcase, Clock, FileText, Search } from 'lucide-react';
import imgSolicitar from '../../../assets/images/categories/Solicitar Servicio.png';
import imgGestionViaticos from '../../../assets/images/categories/gestion_viaticos.png';
import imgReunion from '../../../assets/images/categories/Reunion.png';
import sistemasolicitudes from '../../../assets/images/categories/logistico.png';
import imgInventario from '../../../assets/images/categories/Consultar Reportes.png';
import imgNovedadesNomina from '../../../assets/images/categories/NOVEDADES_NOMINA.png';
import imgComisiones from '../../../assets/images/categories/COMISIONES.png';
import { ALIAS_TIEMPO_ASISTENCIA, obtenerOpcionesTiempoAsistencia } from './GestionTiempoAsistencia/gestionTiempoAsistenciaConfig';

interface DashboardViewProps {
    user: {
        role?: string;
        rol?: string;
        permissions?: string[];
        viaticante?: boolean;
    } | null;
    moduleStatus: Record<string, boolean>;
    onNavigate: (view: 'categories' | 'status' | 'legalizar_gastos' | 'viaticos_gestion' | 'viaticos_estado' | 'reserva_salas' | 'requisiciones' | 'inventario' | 'nomina' | 'contabilidad' | 'gestion_actividades' | 'comisiones' | 'tiempo_asistencia' | 'auditoria_indicadores') => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, moduleStatus, onNavigate }) => {
    const [searchTerm, setSearchTerm] = useState('');
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

    const canSeeTiempoAsistencia = obtenerOpcionesTiempoAsistencia(permissions, moduleStatus).length > 0;

    const canSeeAuditoria = moduleStatus['auditoria_sistema'] !== false && (
        permissions.includes('auditoria_sistema') ||
        ['admin'].includes(userRole) // Solo admins por ahora como pidio el usuario
    );
    const cards = [
        {
            key: 'solicitudes',
            canSee: canSeeSolicitudes,
            title: "Gestión de Solicitudes TI",
            description: "Crea nuevos requerimientos o consulta el estado de tus tickets actuales.",
            icon: <img src={imgSolicitar} alt="" className="w-full h-full object-contain p-1" />,
            onClick: () => onNavigate('categories')
        },
        {
            key: 'reserva_salas',
            canSee: canSeeReservaSalas,
            title: "Reserva de salas",
            description: "Reserva salas de reuniones y espacios para tu equipo.",
            icon: <img src={imgReunion} alt="" className="w-full h-full object-contain p-1" />,
            onClick: () => onNavigate('reserva_salas')
        },
        {
            key: 'requisiciones',
            canSee: canSeeRequisiciones,
            title: "Sistema de Solicitudes",
            description: "Gestión de Requisiciones (Almacén, Suministros, Presupuesto).",
            icon: <img src={sistemasolicitudes} alt="" className="w-full h-full object-contain p-1" />,
            onClick: () => onNavigate('requisiciones')
        },
        {
            key: 'viaticos',
            canSee: canSeeViaticos,
            title: "Gestión de Viáticos",
            description: "Reporte de gastos y consulta de estado de cuenta detallado.",
            icon: <img src={imgGestionViaticos} alt="" className="w-full h-full object-contain p-1" />,
            onClick: () => onNavigate('viaticos_gestion')
        },
        {
            key: 'nomina',
            canSee: canSeeNomina,
            title: "Novedades de Nómina",
            description: "Carga y procesamiento de novedades para SOLID.",
            icon: <img src={imgNovedadesNomina} alt="" className="w-full h-full object-contain p-1" />,
            onClick: () => onNavigate('nomina')
        },
        {
            key: 'comisiones',
            canSee: canSeeComisiones,
            title: "Comisiones",
            description: "Cálculo y procesamiento de comisiones para el personal.",
            icon: <img src={imgComisiones} alt="" className="w-full h-full object-contain p-1" />,
            onClick: () => onNavigate('comisiones')
        },
        {
            key: 'tiempo_asistencia',
            canSee: canSeeTiempoAsistencia,
            title: "Gestión de Tiempo y Asistencia",
            description: "Horarios, asistencia biométrica, horas extras, plantillas y alcance de empleados.",
            searchTerms: ALIAS_TIEMPO_ASISTENCIA,
            icon: <Clock className="h-8 w-8 text-[var(--color-primary)]" />,
            onClick: () => onNavigate('tiempo_asistencia')
        },
        {
            key: 'inventario',
            canSee: canSeeInventario,
            title: "Inventario 2026",
            description: "Toma física de inventario y carga masiva de conteos.",
            icon: <img src={imgInventario} alt="" className="w-full h-full object-contain p-1" />,
            onClick: () => onNavigate('inventario')
        },
        {
            key: 'contabilidad',
            canSee: canSeeContabilidad,
            title: "Gestión Humana",
            description: "Certificados laborales, desprendibles de pago e información tributaria.",
            icon: <FileText className="w-8 h-8 text-[var(--color-primary)]" />,
            onClick: () => onNavigate('contabilidad')
        },
        {
            key: 'gestion_actividades',
            canSee: canSeeGestionActividades,
            title: "Gestión de Actividades",
            description: "Accede a desarrollos, aprobaciones y jerarquía organizacional.",
            icon: <Briefcase className="w-8 h-8 text-[var(--color-primary)]" />,
            onClick: () => onNavigate('gestion_actividades')
        },
        {
            key: 'auditoria',
            canSee: canSeeAuditoria,
            title: "Auditoría del Sistema",
            description: "Indicadores, gráficas y KPIs sobre la trazabilidad y eventos del sistema.",
            icon: <Activity className="w-8 h-8 text-[var(--color-primary)]" />,
            onClick: () => onNavigate('auditoria_indicadores')
        }
    ];

    const activeCards = cards
        .filter(card => card.canSee)
        .filter(card =>
            card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ('searchTerms' in card && card.searchTerms?.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));

    return (
        <div className="space-y-12 py-6">
            <div className="text-center space-y-4">
                <Title variant="h3" weight="bold" className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] bg-clip-text text-transparent">
                    ¿En qué podemos ayudarte hoy?
                </Title>
                <Text variant="h6" color="text-secondary" weight="medium">Selecciona una de las opciones principales de gestión</Text>

                <div className="max-w-md mx-auto pt-4">
                    <Input
                        placeholder="Buscar opción o servicio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={Search}
                        className="w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCards.map(card => (
                    <ServiceCard
                        key={card.key}
                        title={card.title}
                        description={card.description}
                        icon={card.icon}
                        onClick={card.onClick}
                    />
                ))}
            </div>
        </div>
    );
};

export default DashboardView;
