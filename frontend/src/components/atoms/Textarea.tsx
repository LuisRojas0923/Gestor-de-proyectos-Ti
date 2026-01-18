import React from 'react';
import { Text } from './index';

interface TextareaProps {
    placeholder?: string;
    value?: string;
    defaultValue?: string;
    disabled?: boolean;
    required?: boolean;
    error?: boolean;
    errorMessage?: string;
    label?: string;
    helperText?: string;
    rows?: number;
    maxLength?: number;
    className?: string;
    name?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
}

const Textarea: React.FC<TextareaProps> = ({
    placeholder,
    value,
    defaultValue,
    disabled = false,
    required = false,
    error = false,
    errorMessage,
    label,
    helperText,
    rows = 3,
    maxLength,
    className = '',
    name,
    onChange,
    onFocus,
    onBlur,
}) => {
    const baseClasses = 'w-full border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed resize-y';

    const stateClasses = error
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500 dark:border-neutral-600 dark:focus:border-primary-500';

    const backgroundClasses = 'bg-white text-neutral-900 placeholder-neutral-500 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-400';

    return (
        <div className={`w-full ${className}`}>
            {label && (
                <Text as="label" variant="body2" weight="medium" color="text-primary" className="mb-1 block">
                    {label}
                    {required && <Text as="span" color="error" className="ml-1">*</Text>}
                </Text>
            )}

            <textarea
                placeholder={placeholder}
                value={value}
                defaultValue={defaultValue}
                disabled={disabled}
                required={required}
                rows={rows}
                maxLength={maxLength}
                name={name}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                className={`${baseClasses} ${stateClasses} ${backgroundClasses} px-4 py-2 text-sm`}
            />

            {error && errorMessage && (
                <Text variant="caption" color="error" className="mt-1">{errorMessage}</Text>
            )}

            {!error && helperText && (
                <Text variant="caption" color="text-secondary" className="mt-1">{helperText}</Text>
            )}

            {maxLength && value && (
                <Text variant="caption" color="text-secondary" className="mt-1 text-right">
                    {value.length} / {maxLength}
                </Text>
            )}
        </div>
    );
};

export default Textarea;
