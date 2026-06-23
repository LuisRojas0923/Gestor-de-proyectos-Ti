import { Input, Textarea, Text } from '../../../components/atoms';
import { LucideIcon } from 'lucide-react';

export type TicketStatus = 'Pendiente' | 'Proceso' | 'Cerrado' | 'Asignado' | 'Pendiente Información' | 'Resuelto' | 'Escalado';

export const StatusBadge: React.FC<{ status: TicketStatus | string }> = ({ status }) => {
    const styles: Record<string, string> = {
        'Pendiente': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        'Asignado': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        'Proceso': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
        'Pendiente Información': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
        'Escalado': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
        'Resuelto': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
        'Cerrado': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    };
    const style = styles[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800';
    return (
        <Text as="span" className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${style}`}>
            {status}
        </Text>
    );
};

export const FormField: React.FC<{
    label: string, name: string, type?: any, isRequired?: boolean,
    placeholder?: string, value?: string, defaultValue?: string | number, readOnly?: boolean, icon?: LucideIcon,
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void, min?: string | number, max?: string | number,
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}> = ({ label, name, type = 'text', isRequired = true, placeholder, value, defaultValue, readOnly = false, icon, onChange, min, max, onBlur }) => (
    <Input
        label={label}
        labelHint={placeholder}
        name={name}
        type={type}
        required={isRequired && !readOnly}
        placeholder={undefined}
        value={value}
        defaultValue={defaultValue?.toString()}
        disabled={readOnly}
        icon={icon}
        onChange={onChange}
        min={min}
        max={max}
        onBlur={onBlur}
    />
);

export const TextAreaField: React.FC<{
    label: string, name: string, rows?: number, isRequired?: boolean,
    placeholder?: string, value?: string, defaultValue?: string, readOnly?: boolean,
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}> = ({ label, name, rows = 3, isRequired = true, placeholder, value, defaultValue, readOnly = false, onChange }) => (
    <Textarea
        label={label}
        labelHint={placeholder}
        name={name}
        rows={rows}
        required={isRequired && !readOnly}
        placeholder={undefined}
        value={value}
        defaultValue={defaultValue}
        disabled={readOnly}
        onChange={onChange}
    />
);
