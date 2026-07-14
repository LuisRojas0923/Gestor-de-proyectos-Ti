import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { Text } from './Text';
import Input from './Input';

interface SelectOption {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: SelectOption[];
    value?: string | null;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: boolean;
    errorMessage?: string;
    helperText?: string;
    className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    label,
    placeholder = 'Seleccionar...',
    disabled = false,
    required = false,
    error = false,
    errorMessage,
    helperText,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowSearch = searchTerm.toLowerCase();
        return options.filter(opt => opt.label.toLowerCase().includes(lowSearch));
    }, [options, searchTerm]);

    const selectedOption = useMemo(() => {
        return options.find(opt => opt.value === value);
    }, [options, value]);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    const toggleOpen = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        if (!isOpen) setSearchTerm('');
    };

    const stateClasses = error
        ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500'
        : 'border-[var(--color-border)] focus-within:border-[var(--color-primary)] focus-within:ring-[var(--color-primary)]/20 dark:border-[var(--color-border)]/50';

    return (
        <div className={`w-full relative ${className}`} ref={wrapperRef}>
            {label && (
                <Text as="label" variant="body2" weight="medium" color="text-primary" className="mb-1 block">
                    {label}
                    {required && <Text as="span" color="error" className="ml-1">*</Text>}
                </Text>
            )}

            <div
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                onClick={toggleOpen}
                className={`
                    flex items-center justify-between w-full px-4 py-2 text-sm text-left
                    bg-[var(--color-surface)] text-[var(--color-text-primary)]
                    border rounded-xl transition-colors cursor-pointer
                    ${stateClasses}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <span className={`truncate ${!selectedOption ? 'text-[var(--color-text-secondary)] opacity-50' : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className={`transition-transform duration-200 text-[var(--color-text-secondary)] ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 border-b border-neutral-100 dark:border-neutral-700">
                        <Input
                            placeholder="Buscar..."
                            icon={Search}
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            autoFocus
                            className="!rounded-lg !border-none !bg-neutral-50 dark:!bg-neutral-900/50"
                        />
                    </div>
                    <ul className="max-h-60 overflow-y-auto custom-scrollbar p-1" role="listbox">
                        {filteredOptions.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-center text-neutral-500">No se encontraron resultados</li>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = opt.value === value;
                                return (
                                    <li
                                        key={opt.value}
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`
                                            flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors
                                            ${isSelected ? 'bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 font-medium' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}
                                        `}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        {isSelected && <Check size={14} />}
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}

            {error && errorMessage && (
                <Text variant="caption" color="error" className="mt-1">{errorMessage}</Text>
            )}

            {!error && helperText && (
                <Text variant="caption" color="text-secondary" className="mt-1">{helperText}</Text>
            )}
        </div>
    );
};
