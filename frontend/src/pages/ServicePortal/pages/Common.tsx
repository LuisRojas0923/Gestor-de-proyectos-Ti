import { Input, Textarea, Badge } from '../../../components/atoms';
import { LucideIcon } from 'lucide-react';

export type TicketStatus = 'Pendiente' | 'Proceso' | 'Cerrado' | 'Asignado' | 'Pendiente Información' | 'Resuelto' | 'Escalado';

export const StatusBadge: React.FC<{ status: TicketStatus | string }> = ({ status }) => {
    // Definición de variantes basada en el catálogo de diseño
    const getVariant = (s: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
        const normalized = s.toLowerCase();
        
        if (['aprobada', 'resuelto', 'cerrado'].includes(normalized)) return 'success';
        if (['pendiente de gh', 'proceso', 'pendiente información'].includes(normalized)) return 'warning';
        if (['rechazada'].includes(normalized)) return 'error';
        if (['pendiente', 'asignado', 'escalado'].includes(normalized)) return 'info';
        
        return 'default';
    };

    return (
        <Badge variant={getVariant(status)} size="sm" className="font-bold uppercase tracking-wider">
            {status}
        </Badge>
    );
};

export const FormField: React.FC<{
    label: string, name: string, type?: any, isRequired?: boolean,
    placeholder?: string, defaultValue?: string | number, readOnly?: boolean, icon?: LucideIcon
}> = ({ label, name, type = 'text', isRequired = true, placeholder, defaultValue, readOnly = false, icon }) => (
    <Input
        label={label}
        labelHint={placeholder}
        name={name}
        type={type}
        required={isRequired && !readOnly}
        placeholder={undefined}
        defaultValue={defaultValue?.toString()}
        disabled={readOnly}
        icon={icon}
    />
);

export const TextAreaField: React.FC<{
    label: string, name: string, rows?: number, isRequired?: boolean,
    placeholder?: string, defaultValue?: string, readOnly?: boolean
}> = ({ label, name, rows = 3, isRequired = true, placeholder, defaultValue, readOnly = false }) => (
    <Textarea
        label={label}
        labelHint={placeholder}
        name={name}
        rows={rows}
        required={isRequired && !readOnly}
        placeholder={undefined}
        defaultValue={defaultValue}
        disabled={readOnly}
    />
);
