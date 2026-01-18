import React from 'react';
import { Text } from './index';

interface CheckboxProps {
    label?: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    className?: string;
    id?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
    label,
    checked,
    onChange,
    disabled = false,
    className = '',
    id
}) => {
    return (
        <Text as="label" className={`flex items-center cursor-pointer select-none group ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    id={id}
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    className="sr-only"
                />
                <div className={`
          w-5 h-5 border-2 rounded transition-all duration-200 flex items-center justify-center
          ${checked
                        ? 'bg-primary-500 border-primary-500'
                        : 'bg-white border-neutral-300 group-hover:border-primary-400 dark:bg-neutral-800 dark:border-neutral-600'}
        `}>
                    {checked && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </div>
            </div>
            {label && (
                <Text as="span" variant="body2" weight="medium" color="text-primary" className="ml-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {label}
                </Text>
            )}
        </Text>
    );
};

export default Checkbox;
