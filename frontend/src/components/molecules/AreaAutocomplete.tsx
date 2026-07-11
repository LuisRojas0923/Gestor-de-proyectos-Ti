import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { normalizeArea } from '../../utils';
import { Button, Input, Text } from '../atoms';

interface AreaAutocompleteProps {
    label: string;
    placeholder?: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    required?: boolean;
    strictOptions?: boolean;
    errorMessage?: string;
}

const normalizeSearch = (value: string): string =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

const AreaAutocomplete: React.FC<AreaAutocompleteProps> = ({
    label, placeholder, value, options, onChange, required = false, strictOptions = false, errorMessage,
}) => {
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectingOptionRef = useRef(false);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    const term = normalizeSearch(query.trim());
    const filtered = (
        term
            ? options.filter(o => normalizeSearch(o).includes(term))
            : options
    ).slice(0, 8);

    const updateCoords = useCallback(() => {
        if (containerRef.current) {
            const inputElement = containerRef.current.querySelector('input');
            if (inputElement) {
                const rect = inputElement.getBoundingClientRect();
                setCoords({
                    top: rect.bottom,
                    left: rect.left,
                    width: rect.width
                });
            }
        }
    }, []);

    useEffect(() => {
        if (open) {
            updateCoords();
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
        }
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [open, updateCoords]);

    const handleBlur = () => {
        setTimeout(() => {
            setOpen(false);
            if (selectingOptionRef.current) {
                selectingOptionRef.current = false;
                return;
            }

            if (strictOptions) {
                setQuery(value);
                return;
            }

            const normalized = normalizeArea(query);
            setQuery(normalized);
            onChange(normalized);
        }, 150);
    };

    const dropdownStyle: React.CSSProperties = {
        position: 'fixed',
        top: coords ? `${coords.top + 4}px` : undefined,
        left: coords ? `${coords.left}px` : undefined,
        width: coords ? `${coords.width}px` : undefined,
        zIndex: 99999,
    };

    return (
        <div ref={containerRef} className="w-full relative">
            <Text as="label" variant="body2" weight="medium" color="text-primary" className="block mb-1">
                {label}{required && <Text as="span" color="error" className="ml-1">*</Text>}
            </Text>
            <Input
                placeholder={placeholder}
                value={query}
                required={required}
                autoComplete="off"
                error={Boolean(errorMessage)}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (!strictOptions) onChange(e.target.value);
                }}
                onFocus={() => setOpen(true)}
                onBlur={handleBlur}
            />
            {errorMessage && (
                <Text variant="caption" color="error" className="mt-1 block" role="alert">
                    {errorMessage}
                </Text>
            )}
            {open && filtered.length > 0 && coords && createPortal(
                <div 
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150"
                    style={dropdownStyle}
                    role="listbox"
                >
                    {filtered.map((option) => (
                        <Button
                            key={option}
                            variant="custom"
                            className="w-full px-4 py-2.5 text-left hover:bg-[var(--color-primary)]/10 transition-colors border-b border-[var(--color-border)] last:border-0"
                            role="option"
                            aria-selected={option === value}
                            onMouseDown={() => {
                                selectingOptionRef.current = true;
                                setQuery(option);
                                onChange(option);
                                setOpen(false);
                            }}
                        >
                            <Text variant="body2" weight="semibold" color="text-primary">{option}</Text>
                        </Button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};

export default AreaAutocomplete;
