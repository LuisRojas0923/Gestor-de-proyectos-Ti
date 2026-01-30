import React from 'react';
import { Text } from './index';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    options: SelectOption[];
    value?: string;
    defaultValue?: string;
    disabled?: boolean;
    required?: boolean;
    error?: boolean;
    errorMessage?: string;
    label?: string;
    helperText?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    className?: string;
    name?: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onFocus?: (e: React.FocusEvent<HTMLSelectElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
}

const Select: React.FC<SelectProps> = ({
    options,
    value,
    defaultValue,
    disabled = false,
    required = false,
    error = false,
    errorMessage,
    label,
    helperText,
    size = 'md',
    className = '',
    name,
    onChange,
    onFocus,
    onBlur,
}) => {
    const baseClasses = 'w-full border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeClasses = {
        xs: 'px-2 py-1 text-[11px] h-8',
        sm: 'px-3 py-1.5 text-[11px] h-10',
        md: 'px-4 py-2 text-xs',
        lg: 'px-4 py-3 text-sm',
    };

    const stateClasses = error
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 dark:border-[var(--color-border)]/50';

    const backgroundClasses = 'bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50';

    return (
        <div className={`w-full ${className}`}>
            {label && (
                <Text as="label" variant="body2" weight="medium" color="text-primary" className="mb-1 block">
                    {label}
                    {required && <Text as="span" color="error" className="ml-1">*</Text>}
                </Text>
            )}

            <select
                value={value}
                defaultValue={defaultValue}
                disabled={disabled}
                required={required}
                name={name}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                className={`${baseClasses} ${sizeClasses[size]} ${stateClasses} ${backgroundClasses}`}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            {error && errorMessage && (
                <Text variant="caption" color="error" className="mt-1">{errorMessage}</Text>
            )}

            {!error && helperText && (
                <Text variant="caption" color="text-secondary" className="mt-1">{helperText}</Text>
            )}
        </div>
    );
};

export default Select;
