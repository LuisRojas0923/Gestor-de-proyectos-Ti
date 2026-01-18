import { Activity } from '../../types';
import { ActivityCard } from '../../components/molecules';
import { Button, Text } from '../../components/atoms';

interface ActivityLogTabProps {
    activities: Activity[];
    loading: boolean;
    darkMode: boolean;
    hideCompleted: boolean;
    onHideCompletedChange: (hide: boolean) => void;
    onCreateOpen: () => void;
    onComplete: (activity: Activity) => void;
    onEdit: (activity: Activity) => void;
    onDelete: (activity: Activity) => void;
}

const ActivityLogTab: React.FC<ActivityLogTabProps> = ({
    activities,
    loading,
    darkMode,
    hideCompleted,
    onHideCompletedChange,
    onCreateOpen,
    onComplete,
    onEdit,
    onDelete
}) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <Button
                        variant={!hideCompleted ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => onHideCompletedChange(false)}
                    >
                        Todas
                    </Button>
                    <Button
                        variant={hideCompleted ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => onHideCompletedChange(true)}
                    >
                        Pendientes
                    </Button>
                </div>
                <Button
                    variant="primary"
                    size="md"
                    onClick={onCreateOpen}
                >
                    Nueva actividad
                </Button>
            </div>

            {loading ? (
                <Text color="text-secondary">Cargando actividades…</Text>
            ) : activities.length === 0 ? (
                <Text color="text-secondary">No hay actividades.</Text>
            ) : (
                <div className="space-y-6">
                    {activities
                        .filter(a => !hideCompleted || a.status !== 'completada')
                        .map((a) => (
                            <ActivityCard
                                key={a.id}
                                activity={a}
                                darkMode={darkMode}
                                onComplete={onComplete}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                showCompleteButton={a.status !== 'completada'}
                            />
                        ))}
                </div>
            )}
        </div>
    );
};

export default ActivityLogTab;
