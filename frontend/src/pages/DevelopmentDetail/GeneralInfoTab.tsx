import React from 'react';
import { MaterialCard, Title, Text } from '../../components/atoms';
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
    const progressStyle = { width: `${development?.stage_progress_percentage || 0}%` };

    return (
        <div className="space-y-6">
            {/* Información General de la Actividad */}
            <MaterialCard elevation={2}>
                <MaterialCard.Header>
                    <Title variant="h5" className="mb-2">
                        📋 Información General
                    </Title>
                </MaterialCard.Header>
                <MaterialCard.Content>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Nombre de la Actividad
                            </Text>
                            <Text variant="body1">
                                {development?.name || 'No especificado'}
                            </Text>
                        </div>
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                ID de la Actividad
                            </Text>
                            <Text variant="body1">
                                {development?.id || 'No especificado'}
                            </Text>
                        </div>
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Descripción
                            </Text>
                            <Text variant="body1">
                                {development?.description || 'No especificada'}
                            </Text>
                        </div>
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Proceso
                            </Text>
                            <Text variant="body1">
                                {development?.module || 'No especificado'}
                            </Text>
                        </div>
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Tipo
                            </Text>
                            <Text variant="body1">
                                {development?.type || 'No especificado'}
                            </Text>
                        </div>
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Ambiente
                            </Text>
                            <Text variant="body1">
                                {development?.environment || 'No especificado'}
                            </Text>
                        </div>
                    </div>
                </MaterialCard.Content>
            </MaterialCard>

            {/* Estado y Progreso */}
            <MaterialCard elevation={2}>
                <MaterialCard.Header>
                    <Title variant="h5" className="mb-2">
                        📊 Estado y Progreso
                    </Title>
                </MaterialCard.Header>
                <MaterialCard.Content>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Estado General
                            </Text>
                            <Text variant="body1">
                                {development?.general_status || 'No especificado'}
                            </Text>
                        </div>
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Fase Actual
                            </Text>
                            <Text variant="body1">
                                {development?.current_phase?.phase_name || 'No especificada'}
                            </Text>
                        </div>
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Etapa Actual
                            </Text>
                            <Text variant="body1">
                                {development?.current_stage?.stage_name || 'No especificada'}
                            </Text>
                        </div>
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Progreso de Etapa
                            </Text>
                            <div className="flex items-center gap-2">
                                <div className={`w-full bg-neutral-200 rounded-full h-2 ${darkMode ? 'bg-neutral-600' : 'bg-neutral-200'}`}>
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={progressStyle}
                                    ></div>
                                </div>
                                <Text variant="body2">
                                    {development?.stage_progress_percentage || 0}%
                                </Text>
                            </div>
                        </div>
                    </div>
                </MaterialCard.Content>
            </MaterialCard>

            {/* Responsables y Proveedores */}
            <MaterialCard elevation={2}>
                <MaterialCard.Header>
                    <Title variant="h5" className="mb-2">
                        👥 Responsables
                    </Title>
                </MaterialCard.Header>
                <MaterialCard.Content>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Autoridad
                            </Text>
                            <Text variant="body1">
                                {development?.authority || 'No especificada'}
                            </Text>
                        </div>

                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Responsable
                            </Text>
                            <Text variant="body1">
                                {development?.responsible || 'No especificado'}
                            </Text>
                        </div>
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Área Solicitante
                            </Text>
                            <Text variant="body1">
                                {development?.requesting_area || 'No especificada'}
                            </Text>
                        </div>
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Usuario Responsable Principal
                            </Text>
                            <Text variant="body1">
                                {development?.main_responsible || 'No especificado'}
                            </Text>
                        </div>
                    </div>
                </MaterialCard.Content>
            </MaterialCard>

            {/* Fechas */}
            <MaterialCard elevation={2}>
                <MaterialCard.Header>
                    <Title variant="h5" className="mb-2">
                        📅 Fechas Importantes
                    </Title>
                </MaterialCard.Header>
                <MaterialCard.Content>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Fecha de Inicio
                            </Text>
                            <Text variant="body1">
                                {development?.start_date ? new Date(development.start_date).toLocaleDateString('es-ES') : 'No especificada'}
                            </Text>
                        </div>
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Fecha Estimada de Fin
                            </Text>
                            <Text variant="body1">
                                {development?.estimated_end_date ? new Date(development.estimated_end_date).toLocaleDateString('es-ES') : 'No especificada'}
                            </Text>
                        </div>
                        <div>
                            <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                Días Estimados
                            </Text>
                            <Text variant="body1">
                                {development?.estimated_days || 'No especificados'}
                            </Text>
                        </div>
                    </div>
                </MaterialCard.Content>
            </MaterialCard>

            {/* Última Actividad */}
            <MaterialCard elevation={2}>
                <MaterialCard.Header>
                    <Title variant="h5" className="mb-2">
                        🔄 Última Actividad de Bitácora
                    </Title>
                </MaterialCard.Header>
                <MaterialCard.Content>
                    {activitiesLoading ? (
                        <Text variant="body1" color="text-secondary">
                            Cargando última actividad...
                        </Text>
                    ) : lastActivity ? (
                        <MaterialCard elevation={1} className="bg-opacity-50">
                            <MaterialCard.Content>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <Title variant="h6" className="mb-2">
                                            {lastActivity.stage_name}
                                        </Title>
                                        <Text variant="body2" color="text-secondary">
                                            {new Date(lastActivity.created_at).toLocaleString('es-ES')}
                                        </Text>
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
                                        <Text variant="subtitle2" color="text-secondary" className="mb-2">
                                            Notas:
                                        </Text>
                                        <Text variant="body2">
                                            {lastActivity.notes}
                                        </Text>
                                    </div>
                                )}
                            </MaterialCard.Content>
                        </MaterialCard>
                    ) : (
                        <Text variant="body1" color="text-secondary">
                            No hay actividades registradas en la bitácora.
                        </Text>
                    )}
                </MaterialCard.Content>
            </MaterialCard>
        </div>
    );
};

export default GeneralInfoTab;
