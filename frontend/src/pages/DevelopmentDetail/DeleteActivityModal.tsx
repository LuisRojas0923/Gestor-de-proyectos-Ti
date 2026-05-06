import React from 'react';
import { Text, Button, Badge } from '../../components/atoms';
import { Trash2 } from 'lucide-react';

interface DeletePreview {
    actividad: { id: number; titulo: string; estado: string };
    hijos: { id: number; titulo: string; nivel: number; estado: string }[];
    total_eliminaciones: number;
}

interface DeleteActivityModalProps {
    isOpen: boolean;
    preview: DeletePreview | null;
    onClose: () => void;
    onConfirm: () => void;
}

export const DeleteActivityModal: React.FC<DeleteActivityModalProps> = ({
    isOpen,
    preview,
    onClose,
    onConfirm,
}) => {
    if (!isOpen || !preview) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[var(--color-surface)] rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-[var(--color-border)]">
                <div className="p-6 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                            <Trash2 className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <Text weight="bold" className="text-lg">Eliminar actividad</Text>
                            <Text variant="caption" color="text-secondary">
                                Esta accion es irreversible
                            </Text>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4 max-h-64 overflow-y-auto">
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <Text variant="caption" weight="bold" className="text-red-700 dark:text-red-400">
                            {preview.actividad.titulo}
                        </Text>
                        {preview.total_eliminaciones > 1 && (
                            <Text variant="caption" className="text-red-600 dark:text-red-500 block mt-1">
                                + {preview.total_eliminaciones - 1} elemento(s) dependiente(s)
                            </Text>
                        )}
                    </div>

                    {preview.hijos.length > 0 && (
                        <div>
                            <Text variant="caption" weight="bold" className="mb-2 block">Tareas que se eliminaran:</Text>
                            <div className="space-y-1">
                                {preview.hijos.map(h => (
                                    <div key={h.id} className="flex items-center gap-2">
                                        <Text variant="caption" color="text-secondary" className="pl-4">
                                            {'-'.repeat(h.nivel)} {h.titulo}
                                        </Text>
                                        <Badge variant={h.estado === 'Completada' ? 'success' : 'warning'} size="sm">
                                            {h.estado}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-[var(--color-border)] flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={onConfirm}>
                        Eliminar ({preview.total_eliminaciones})
                    </Button>
                </div>
            </div>
        </div>
    );
};
