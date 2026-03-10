import React from 'react';
import { ArrowLeft, User, Briefcase, MapPin, ClipboardList, Laptop, DollarSign, Info } from 'lucide-react';
import { StatusBadge } from './Common';
import { Button, Title, Text, Icon } from '../../../components/atoms';
import { formatFriendlyDate } from '../../../utils/dateUtils';
import { useAppContext } from '../../../context/AppContext';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';
import { useState } from 'react';

interface Requisicion {
    id: string;
    solicitante_nombre: string;
    solicitante_area: string;
    solicitante_sede: string;
    solicitante_email: string;
    ciudad_contratacion: string;
    orden_trabajo: string;
    nombre_proyecto: string;
    direccion_proyecto: string;
    encargado_sitio: string;
    area_destino: string;
    cargo_nombre: string;
    numero_personas: number;
    trabajo_alturas: string;
    duracion_contrato: string;
    fecha_ingreso: string;
    centro_costo: string;
    causal_requisicion: string;
    perfil_o: string;
    equipos_oficina: string;
    equipos_detalle?: string;
    equipos_tecnologicos: string;
    tecnologia_detalle?: string;
    sim_card_requerida: string;
    sim_card_plan?: string;
    programas_especiales_requeridos: string;
    programas_especiales_detalle?: string;
    salario_asignado: number;
    horas_extra: string;
    modalidad_contratacion: string;
    tipo_contratacion: string;
    auxilio_movilizacion?: number;
    auxilio_alimentacion?: number;
    auxilio_vivienda?: number;
    estado: string;
    fecha_creacion: string;
}

interface RequisicionDetailViewProps {
    requisicion: Requisicion;
    onBack: () => void;
}

const RequisicionDetailView: React.FC<RequisicionDetailViewProps> = ({ requisicion, onBack }) => {
    const { state } = useAppContext();
    const { user } = state;
    const { addNotification } = useNotifications();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rejectComment, setRejectComment] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [successAction, setSuccessAction] = useState(false);

    const userAreas = JSON.parse(user?.areas_asignadas || '[]') as string[];
    const userEspecialidades = JSON.parse(user?.especialidades || '[]') as string[];

    const canApproveJefe = requisicion.estado === 'Pendiente de Jefe' && userAreas.includes(requisicion.area_destino);
    const canApproveGH = requisicion.estado === 'Pendiente de GH' && userEspecialidades.includes('gestion_humana');
    const canApproveAdmin = user?.rol === 'admin' && (requisicion.estado === 'Pendiente de Jefe' || requisicion.estado === 'Pendiente de GH');

    const isApprover = canApproveJefe || canApproveGH || canApproveAdmin;

    const handleApproval = async (approved: boolean, level: 'jefe' | 'gh') => {
        if (!approved && !rejectComment) {
            setShowRejectInput(true);
            addNotification('warning', 'Por favor, ingresa un motivo para rechazar.');
            return;
        }

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('token');
            const endpoint = level === 'jefe' ? 'revision-jefe' : 'revision-gh';
            await axios.patch(`${API_CONFIG.BASE_URL}/requisiciones/${requisicion.id}/${endpoint}`, {
                aprobado: approved,
                comentario: rejectComment || null
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            addNotification('success', `Requisición ${approved ? 'aprobada' : 'rechazada'} exitosamente`);
            setSuccessAction(true);
            setTimeout(() => {
                onBack(); // Volver a la vista de lista
            }, 1000);
        } catch (error) {
            addNotification('error', `Error al procesar la ${approved ? 'aprobación' : 'rechazo'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const InfoSection = ({ title, icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
        <div className="space-y-4">
            <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                <Icon name={icon} size="sm" />
                <Title variant="h6" className="font-bold uppercase tracking-wider">{title}</Title>
                <div className="flex-grow border-t border-[var(--color-border)]"></div>
            </div>
            <div className="bg-[var(--color-surface-variant)]/30 p-6 rounded-3xl border border-[var(--color-border)] grid grid-cols-1 md:grid-cols-2 gap-6">
                {children}
            </div>
        </div>
    );

    const DataField = ({ label, value, fullWidth = false }: { label: string, value: string | number | undefined, fullWidth?: boolean }) => {
        const displayValue = typeof value === 'string' ? value.replace(/_/g, ' ') : value;

        return (
            <div className={fullWidth ? "md:col-span-2" : ""}>
                <Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-1 block tracking-wider text-[10px]">
                    {label}
                </Text>
                <Text variant="body2" weight="bold" color="text-primary" className="leading-tight">
                    {displayValue ?? '---'}
                </Text>
            </div>
        );
    };

    return (
        <div className="space-y-8 py-4">
            <Button
                variant="ghost"
                onClick={onBack}
                icon={ArrowLeft}
                className="font-bold p-0"
            >
                Volver a la lista
            </Button>

            <div className="bg-[var(--color-surface)] rounded-[2.5rem] shadow-xl border border-[var(--color-border)] overflow-hidden transition-all duration-300">
                {/* Header Section */}
                <div className="bg-[var(--deep-navy)] p-8 text-white">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-2">
                            <Text variant="caption" weight="medium" color="inherit" className="bg-white/10 px-3 py-1 rounded-lg font-mono uppercase tracking-widest inline-block w-fit">{requisicion.id}</Text>
                        </div>
                        <StatusBadge status={requisicion.estado} />
                    </div>
                    <Title variant="h3" weight="bold" color="white">{requisicion.nombre_proyecto}</Title>
                    <div className="flex items-center gap-2 mt-2 opacity-80">
                        <Icon name={Briefcase} size="sm" />
                        <Text variant="body1" color="inherit" weight="medium">{requisicion.cargo_nombre}</Text>
                    </div>
                </div>

                <div className="p-8 space-y-10">
                    <div className="grid grid-cols-1 gap-10">

                        {/* Approval Panel */}
                        {isApprover && !successAction && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-6 md:p-8 rounded-3xl border border-amber-200 dark:border-amber-800/30">
                                <Title variant="h5" weight="bold" color="text-amber-800" className="flex items-center gap-2 mb-2">
                                    <Icon name={ClipboardList} />
                                    Acción Requerida: Revisión
                                </Title>
                                <Text variant="body2" className="text-amber-700 dark:text-amber-500 mb-6">Esta requisición está esperando tu revisión. Por favor, verifica los detalles antes de dar tu veredicto.</Text>

                                {showRejectInput && (
                                    <div className="mb-6 space-y-2">
                                        <Text variant="caption" weight="bold" className="text-amber-800 dark:text-amber-400">Motivo del rechazo (Obligatorio):</Text>
                                        <textarea
                                            className="w-full h-24 p-3 rounded-xl border border-amber-200 bg-white dark:bg-neutral-800 dark:border-amber-800/50 resize-none focus:border-red-400 focus:ring focus:ring-red-400/20 text-sm"
                                            placeholder="Escribe aquí las razones del rechazo..."
                                            value={rejectComment}
                                            onChange={(e) => setRejectComment(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Button
                                        variant="primary"
                                        onClick={() => handleApproval(true, requisicion.estado === 'Pendiente de Jefe' ? 'jefe' : 'gh')}
                                        loading={isSubmitting}
                                        className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-white border-transparent"
                                    >
                                        Aprobar Requisición
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleApproval(false, requisicion.estado === 'Pendiente de Jefe' ? 'jefe' : 'gh')}
                                        loading={isSubmitting}
                                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/10 h-12"
                                    >
                                        {showRejectInput ? 'Confirmar Rechazo' : 'Rechazar...'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {successAction && (
                            <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-3xl border border-green-200 text-center animate-in fade-in zoom-in duration-300">
                                <Title variant="h6" className="text-green-700 font-bold">¡Revisión enviada!</Title>
                                <Text variant="caption" className="text-green-600">Volviendo a la lista...</Text>
                            </div>
                        )}

                        {/* 1. Información del Solicitante */}
                        <InfoSection title="Información del Solicitante" icon={User}>
                            <DataField label="Nombre" value={requisicion.solicitante_nombre} />
                            <DataField label="Área" value={requisicion.solicitante_area} />
                            <DataField label="Sede" value={requisicion.solicitante_sede} />
                            <DataField label="Email" value={requisicion.solicitante_email} />
                        </InfoSection>

                        {/* 2. Detalles de la Orden y Sitio */}
                        <InfoSection title="Detalles de Operación" icon={MapPin}>
                            <DataField label="Ciudad de Contratación" value={requisicion.ciudad_contratacion} />
                            <DataField label="Orden de Trabajo" value={requisicion.orden_trabajo} />
                            <DataField label="Dirección Proyecto" value={requisicion.direccion_proyecto} />
                            <DataField label="Encargado en Sitio" value={requisicion.encargado_sitio} />
                        </InfoSection>

                        {/* 3. Información de la Vacante */}
                        <InfoSection title="Detalles de la Vacante" icon={ClipboardList}>
                            <DataField label="Área Destino" value={requisicion.area_destino} />
                            <DataField label="Cargo" value={requisicion.cargo_nombre} />
                            <DataField label="Número de Personas" value={requisicion.numero_personas} />
                            <DataField label="Trabajo en Alturas" value={requisicion.trabajo_alturas === 'aplica' ? 'SÍ APLICA' : 'NO APLICA'} />
                            <DataField label="Duración Contrato" value={requisicion.duracion_contrato} />
                            <DataField label="Fecha Ingreso Sugerida" value={formatFriendlyDate(requisicion.fecha_ingreso)} />
                            <DataField label="Centro de Costo" value={requisicion.centro_costo} />
                            <DataField label="Causal de Requisición" value={requisicion.causal_requisicion} />
                            <DataField label="Perfil y Observaciones" value={requisicion.perfil_o} fullWidth />
                        </InfoSection>

                        {/* 4. Condiciones de Contratación */}
                        <InfoSection title="Condiciones y Beneficios" icon={DollarSign}>
                            <DataField label="Salario Asignado" value={`$ ${new Intl.NumberFormat('es-CO').format(requisicion.salario_asignado)}`} />
                            <DataField label="Horas Extra / Recargos" value={requisicion.horas_extra === 'si' ? 'SÍ' : 'NO'} />
                            <DataField label="Modalidad" value={requisicion.modalidad_contratacion} />
                            <DataField label="Tipo de Contrato" value={requisicion.tipo_contratacion} />
                            {requisicion.auxilio_movilizacion ? <DataField label="Auxilio Movilización" value={`$ ${new Intl.NumberFormat('es-CO').format(requisicion.auxilio_movilizacion)}`} /> : null}
                            {requisicion.auxilio_alimentacion ? <DataField label="Auxilio Alimentación" value={`$ ${new Intl.NumberFormat('es-CO').format(requisicion.auxilio_alimentacion)}`} /> : null}
                            {requisicion.auxilio_vivienda ? <DataField label="Auxilio Vivienda" value={`$ ${new Intl.NumberFormat('es-CO').format(requisicion.auxilio_vivienda)}`} /> : null}
                        </InfoSection>

                        {/* 5. Requisitos Generales */}
                        <InfoSection title="Equipos y Herramientas" icon={Laptop}>
                            <DataField label="Equipos de Oficina" value={requisicion.equipos_oficina === 'si' ? (requisicion.equipos_detalle || 'SÍ') : 'NO'} />
                            <DataField label="Equipos Tecnológicos" value={requisicion.equipos_tecnologicos === 'si' ? (requisicion.tecnologia_detalle || 'SÍ') : 'NO'} />
                            <DataField label="Sim Card Requerida" value={requisicion.sim_card_requerida === 'si' ? (requisicion.sim_card_plan ? `Plan: ${requisicion.sim_card_plan}` : 'SÍ') : 'NO'} />
                            <DataField label="Programas Especiales" value={requisicion.programas_especiales_requeridos === 'si' ? (requisicion.programas_especiales_detalle || 'SÍ') : 'NO'} />
                        </InfoSection>

                        {/* Audit Info */}
                        <div className="flex items-center justify-center pt-8 border-t border-[var(--color-border)] opacity-40">
                            <Icon name={Info} size="xs" className="mr-2" />
                            <Text variant="caption" weight="medium">Solicitud creada el {formatFriendlyDate(requisicion.fecha_creacion)}</Text>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequisicionDetailView;
