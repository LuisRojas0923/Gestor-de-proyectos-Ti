import React from 'react';
import { Input, Textarea } from '../../components/atoms';
import { LucideIcon } from 'lucide-react';

export type TicketStatus = 'Abierto' | 'En Proceso' | 'Cerrado' | 'Pendiente Info' | 'Escalado';

export const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
    const styles = {
        'Abierto': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        'En Proceso': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-blue-800',
        'Cerrado': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-blue-800',
        'Pendiente Info': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-blue-800',
        'Escalado': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-blue-800'
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${styles[status]}`}>
            {status}
        </span>
    );
};

export const FormField: React.FC<{
    label: string, name: string, type?: any, isRequired?: boolean,
    placeholder?: string, defaultValue?: string | number, readOnly?: boolean, icon?: LucideIcon
}> = ({ label, name, type = 'text', isRequired = true, placeholder, defaultValue, readOnly = false, icon }) => (
    <Input
        label={label}
        name={name}
        type={type}
        required={isRequired && !readOnly}
        placeholder={placeholder}
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
