import { Input, Textarea, Text } from '../../../components/atoms';
import { LucideIcon } from 'lucide-react';

export type TicketStatus = 'Asignado' | 'En Proceso' | 'Pendiente Info' | 'Escalado' | 'Resuelto' | 'Cerrado';

export const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
    const styles = {
        'Asignado': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        'En Proceso': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-blue-800',
        'Pendiente Info': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-blue-800',
        'Escalado': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-blue-800',
        'Resuelto': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-blue-800',
        'Cerrado': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-blue-800',
    };
    return (
        <Text as="span" className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${styles[status]}`}>
            {status}
        </Text>
    );
};

export const FormField: React.FC<{
    label: string, name: string, type?: any, isRequired?: boolean,
    placeholder?: string, defaultValue?: string | number, readOnly?: boolean, icon?: LucideIcon
}> = ({ label, name, type = 'text', isRequired = true, placeholder, defaultValue, readOnly = false, icon }) => (
    <Input
        label={placeholder ? `${placeholder} — ${label}` : label}
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
        name={name}
        rows={rows}
        required={isRequired && !readOnly}
        placeholder={placeholder}
        defaultValue={defaultValue}
        disabled={readOnly}
    />
);
