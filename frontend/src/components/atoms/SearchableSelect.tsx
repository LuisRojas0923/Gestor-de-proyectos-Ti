import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { Text } from './Text';
import Input from './Input';
import Button from './Button';

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
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listboxRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const listboxId = useId();
    const [position, setPosition] = useState({ top: 0, left: 0, width: 240, maxHeight: 240 });

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(target) &&
                !popoverRef.current?.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const updatePosition = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const width = Math.max(rect.width, 240);
            const left = Math.min(rect.left, window.innerWidth - width - 8);
            const spaceBelow = window.innerHeight - rect.bottom - 8;
            const spaceAbove = rect.top - 8;
            const opensUp = spaceBelow < 240 && spaceAbove > spaceBelow;
            const availableSpace = opensUp ? spaceAbove : spaceBelow;
            const maxHeight = Math.max(80, Math.min(240, availableSpace - 64));
            const top = opensUp ? Math.max(8, rect.top - maxHeight - 60) : rect.bottom + 4;
            setPosition({ top, left: Math.max(8, left), width, maxHeight });
        };
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        requestAnimationFrame(() => searchRef.current?.focus());
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    useLayoutEffect(() => {
        if (!isOpen || !popoverRef.current || !listboxRef.current) return;
        popoverRef.current.style.top = `${position.top}px`;
        popoverRef.current.style.left = `${position.left}px`;
        popoverRef.current.style.width = `${position.width}px`;
        popoverRef.current.style.maxHeight = `${position.maxHeight + 60}px`;
        listboxRef.current.style.maxHeight = `${position.maxHeight}px`;
    }, [isOpen, position]);

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
        setSearchTerm('');
        closeAndFocus();
    };

    const toggleOpen = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        if (!isOpen) setSearchTerm('');
    };

    const closeAndFocus = () => {
        setIsOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
    };

    const closeAndMoveFocus = (backwards: boolean) => {
        setIsOpen(false);
        requestAnimationFrame(() => {
            const focusable = Array.from(document.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
            ));
            const triggerIndex = triggerRef.current ? focusable.indexOf(triggerRef.current) : -1;
            focusable[triggerIndex + (backwards ? -1 : 1)]?.focus();
        });
    };

    const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            if (!disabled) setIsOpen(true);
        } else if (event.key === 'Escape') {
            closeAndFocus();
        }
    };

    const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            optionRefs.current[0]?.focus();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            closeAndFocus();
        } else if (event.key === 'Tab') {
            event.preventDefault();
            closeAndMoveFocus(event.shiftKey);
        }
    };

    const handleOptionKeyDown = (
        event: React.KeyboardEvent<HTMLButtonElement>,
        index: number,
        optionValue: string,
    ) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const offset = event.key === 'ArrowDown' ? 1 : -1;
            const next = (index + offset + filteredOptions.length) % filteredOptions.length;
            optionRefs.current[next]?.focus();
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleSelect(optionValue);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            closeAndFocus();
        } else if (event.key === 'Tab') {
            event.preventDefault();
            closeAndMoveFocus(event.shiftKey);
        }
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

            <Button
                ref={triggerRef}
                type="button"
                variant="custom"
                role="combobox"
                aria-label={label || placeholder}
                aria-expanded={isOpen}
                aria-controls={listboxId}
                onClick={toggleOpen}
                onKeyDown={handleTriggerKeyDown}
                disabled={disabled}
                fullWidth
                className={`
                    flex items-center justify-between w-full px-4 py-2 text-sm text-left
                    bg-[var(--color-surface)] text-[var(--color-text-primary)]
                    border rounded-xl transition-colors cursor-pointer
                    ${stateClasses}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <Text as="span" variant="body2" className={`truncate ${!selectedOption ? 'text-[var(--color-text-secondary)] opacity-50' : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <ChevronDown size={16} className={`transition-transform duration-200 text-[var(--color-text-secondary)] ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed z-[9999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                    <div className="p-2 border-b border-[var(--color-border)]">
                        <Input
                            ref={searchRef}
                            type="search"
                            aria-label={`Buscar opciones de ${label || placeholder}`}
                            placeholder="Buscar..."
                            icon={Search}
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            autoFocus
                            className="!rounded-lg !border-none !bg-[var(--color-surface-variant)]"
                        />
                    </div>
                    <div ref={listboxRef} id={listboxId} className="overflow-y-auto custom-scrollbar p-1" role="listbox">
                        {filteredOptions.length === 0 ? (
                            <Text variant="body2" align="center" color="text-secondary" className="px-4 py-3">No se encontraron resultados</Text>
                        ) : (
                            filteredOptions.map((opt, index) => {
                                const isSelected = opt.value === value;
                                return (
                                    <Button
                                        key={opt.value}
                                        ref={(node) => { optionRefs.current[index] = node; }}
                                        type="button"
                                        variant="custom"
                                        role="option"
                                        aria-label={opt.label}
                                        aria-selected={isSelected}
                                        onClick={() => handleSelect(opt.value)}
                                        onKeyDown={(event) => handleOptionKeyDown(event, index, opt.value)}
                                        fullWidth
                                        className={`
                                            flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors
                                            ${isSelected ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium' : 'hover:bg-[var(--color-surface-variant)] text-[var(--color-text-primary)]'}
                                        `}
                                    >
                                        <Text as="span" variant="body2" className="truncate">{opt.label}</Text>
                                        {isSelected && <Check size={14} />}
                                    </Button>
                                );
                            })
                        )}
                    </div>
                </div>
            , document.body)}

            {error && errorMessage && (
                <Text variant="caption" color="error" className="mt-1">{errorMessage}</Text>
            )}

            {!error && helperText && (
                <Text variant="caption" color="text-secondary" className="mt-1">{helperText}</Text>
            )}
        </div>
    );
};
