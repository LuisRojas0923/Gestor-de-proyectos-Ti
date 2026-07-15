import React from 'react';
import { Text, Button, Badge } from '../../components/atoms';
import { Ban } from 'lucide-react';
import Modal from '../../components/molecules/Modal';

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
    isSubmitting?: boolean;
}

export const DeleteActivityModal: React.FC<DeleteActivityModalProps> = ({
    isOpen,
    preview,
    onClose,
    onConfirm,
    isSubmitting = false,
}) => {
    if (!isOpen || !preview) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            closeOnOverlayClick={false}
            title={(
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                        <Ban className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <Text weight="bold" className="text-lg">Anular actividad</Text>
                        <Text variant="caption" color="text-secondary">
                            La actividad quedará visible como anulada
                        </Text>
                    </div>
                </div>
            )}
        >
            <div className="space-y-4">
                <div className="space-y-4 max-h-64 overflow-y-auto">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <Text variant="caption" weight="bold" className="text-amber-700 dark:text-amber-400">
                            {preview.actividad.titulo}
                        </Text>
                        {preview.total_eliminaciones > 1 && (
                            <Text variant="caption" className="text-amber-700 dark:text-amber-400 block mt-1">
                                + {preview.total_eliminaciones - 1} elemento(s) dependiente(s)
                            </Text>
                        )}
                    </div>

                    {preview.hijos.length > 0 && (
                        <div>
                            <Text variant="caption" weight="bold" className="mb-2 block">Tareas que se anularán:</Text>
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

                <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={onConfirm} loading={isSubmitting}>
                        Anular ({preview.total_eliminaciones})
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
