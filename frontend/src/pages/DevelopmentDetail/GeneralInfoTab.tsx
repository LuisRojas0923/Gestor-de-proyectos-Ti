import React from 'react';
import { MaterialCard, MaterialTypography, Text } from '../../components/atoms';
import { DevelopmentWithCurrentStatus, Activity } from '../../types';

interface GeneralInfoTabProps {
    development: DevelopmentWithCurrentStatus | null;
    darkMode: boolean;
    activitiesLoading: boolean;
    lastActivity: Activity | null;
}

const GeneralInfoTab: React.FC<GeneralInfoTabProps> = ({
    development,
    darkMode,
    activitiesLoading,
    lastActivity
}) => {
    return (
        <div className="space-y-6">
            {/* Información General del Desarrollo */}
            <MaterialCard elevation={2}>
                <MaterialCard.Header>
                    <MaterialTypography variant="h5" gutterBottom>
                        📋 Información General
                    </MaterialTypography>
                </MaterialCard.Header>
                <MaterialCard.Content>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Nombre del Desarrollo
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.name || 'No especificado'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                ID del Desarrollo
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.id || 'No especificado'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Descripción
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.description || 'No especificada'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Módulo
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.module || 'No especificado'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Tipo
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.type || 'No especificado'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Ambiente
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.environment || 'No especificado'}
                            </MaterialTypography>
                        </div>
                    </div>
                </MaterialCard.Content>
            </MaterialCard>

            {/* Estado y Progreso */}
            <MaterialCard elevation={2}>
                <MaterialCard.Header>
                    <MaterialTypography variant="h5" gutterBottom>
                        📊 Estado y Progreso
                    </MaterialTypography>
                </MaterialCard.Header>
                <MaterialCard.Content>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Estado General
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.general_status || 'No especificado'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Fase Actual
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.current_phase?.phase_name || 'No especificada'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Etapa Actual
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.current_stage?.stage_name || 'No especificada'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Progreso de Etapa
                            </MaterialTypography>
                            <div className="flex items-center gap-2">
                                <div className={`w-full bg-neutral-200 rounded-full h-2 ${darkMode ? 'bg-neutral-600' : 'bg-neutral-200'}`}>
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${development?.stage_progress_percentage || 0}%` }}
                                    ></div>
                                </div>
                                <MaterialTypography variant="body2">
                                    {development?.stage_progress_percentage || 0}%
                                </MaterialTypography>
                            </div>
                        </div>
                    </div>
                </MaterialCard.Content>
            </MaterialCard>

            {/* Responsables y Proveedores */}
            <MaterialCard elevation={2}>
                <MaterialCard.Header>
                    <MaterialTypography variant="h5" gutterBottom>
                        👥 Responsables y Proveedores
                    </MaterialTypography>
                </MaterialCard.Header>
                <MaterialCard.Content>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Proveedor
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.provider || 'No especificado'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Responsable
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.responsible || 'No especificado'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Área Solicitante
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.requesting_area || 'No especificada'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Usuario Responsable Principal
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.main_responsible || 'No especificado'}
                            </MaterialTypography>
                        </div>
                    </div>
                </MaterialCard.Content>
            </MaterialCard>

            {/* Fechas */}
            <MaterialCard elevation={2}>
                <MaterialCard.Header>
                    <MaterialTypography variant="h5" gutterBottom>
                        📅 Fechas Importantes
                    </MaterialTypography>
                </MaterialCard.Header>
                <MaterialCard.Content>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Fecha de Inicio
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.start_date ? new Date(development.start_date).toLocaleDateString('es-ES') : 'No especificada'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Fecha Estimada de Fin
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.estimated_end_date ? new Date(development.estimated_end_date).toLocaleDateString('es-ES') : 'No especificada'}
                            </MaterialTypography>
                        </div>
                        <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                Días Estimados
                            </MaterialTypography>
                            <MaterialTypography variant="body1">
                                {development?.estimated_days || 'No especificados'}
                            </MaterialTypography>
                        </div>
                    </div>
                </MaterialCard.Content>
            </MaterialCard>

            {/* Última Actividad */}
            <MaterialCard elevation={2}>
                <MaterialCard.Header>
                    <MaterialTypography variant="h5" gutterBottom>
                        🔄 Última Actividad de Bitácora
                    </MaterialTypography>
                </MaterialCard.Header>
                <MaterialCard.Content>
                    {activitiesLoading ? (
                        <MaterialTypography variant="body1" color="textSecondary">
                            Cargando última actividad...
                        </MaterialTypography>
                    ) : lastActivity ? (
                        <MaterialCard elevation={1} className="bg-opacity-50">
                            <MaterialCard.Content>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <MaterialTypography variant="h6" gutterBottom>
                                            {lastActivity.stage_name}
                                        </MaterialTypography>
                                        <MaterialTypography variant="body2" color="textSecondary">
                                            {new Date(lastActivity.created_at).toLocaleString('es-ES')}
                                        </MaterialTypography>
                                    </div>
                                    <Text
                                        as="span"
                                        variant="caption"
                                        weight="bold"
                                        className={`px-2 py-1 rounded-full ${lastActivity.status === 'completada'
                                            ? 'bg-green-100 text-green-800'
                                            : lastActivity.status === 'en_curso'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}
                                    >
                                        {lastActivity.status === 'completada' ? '✅ Completada' :
                                            lastActivity.status === 'en_curso' ? '🔄 En curso' : '⏳ Pendiente'}
                                    </Text>
                                </div>
                                {lastActivity.notes && (
                                    <div className="mb-3">
                                        <MaterialTypography variant="subtitle2" color="textSecondary" gutterBottom>
                                            Notas:
                                        </MaterialTypography>
                                        <MaterialTypography variant="body2">
                                            {lastActivity.notes}
                                        </MaterialTypography>
                                    </div>
                                )}
                            </MaterialCard.Content>
                        </MaterialCard>
                    ) : (
                        <MaterialTypography variant="body1" color="textSecondary">
                            No hay actividades registradas en la bitácora.
                        </MaterialTypography>
                    )}
                </MaterialCard.Content>
            </MaterialCard>
        </div>
    );
};

export default GeneralInfoTab;
