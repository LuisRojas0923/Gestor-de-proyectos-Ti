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
}

const AreaAutocomplete: React.FC<AreaAutocompleteProps> = ({
    label, placeholder, value, options, onChange,
}) => {
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    const term = query.trim().toUpperCase();
    const filtered = (
        term
            ? options.filter(o => o.includes(term))
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
                {label}
            </Text>
            <Input
                placeholder={placeholder}
                value={query}
                autoComplete="off"
                onChange={(e) => {
                    setQuery(e.target.value);
                    onChange(e.target.value);
                }}
                onFocus={() => setOpen(true)}
                onBlur={handleBlur}
            />
            {open && filtered.length > 0 && coords && createPortal(
                <div 
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150"
                    style={dropdownStyle}
                >
                    {filtered.map((option) => (
                        <Button
                            key={option}
                            variant="custom"
                            className="w-full px-4 py-2.5 text-left hover:bg-[var(--color-primary)]/10 transition-colors border-b border-[var(--color-border)] last:border-0"
                            onMouseDown={() => {
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
