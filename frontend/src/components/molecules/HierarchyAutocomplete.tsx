import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HierarchyUser } from '../../types/hierarchy';
import { Button, Input, Text } from '../atoms';

interface HierarchyAutocompleteProps {
    label: string;
    placeholder?: string;
    value: string;
    options: HierarchyUser[];
    onChange: (text: string) => void;
    onSelect: (user: HierarchyUser) => void;
}

const HierarchyAutocomplete: React.FC<HierarchyAutocompleteProps> = ({
    label, placeholder, value, options, onChange, onSelect,
}) => {
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    const term = query.trim().toLowerCase();
    const filtered = (
        term
            ? options.filter(u =>
                  u.nombre.toLowerCase().includes(term) ||
                  (u.cedula || '').includes(term)
              )
            : options
    ).slice(0, 5);

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
                    const text = e.target.value;
                    setQuery(text);
                    onChange(text);
                    if (!text) onSelect({ id: '', nombre: '', rol: '', cedula: '' });
                }}
                onFocus={() => setOpen(true)}
                onBlur={handleBlur}
            />
            {open && filtered.length > 0 && coords && createPortal(
                <div 
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150 flex flex-col"
                    style={dropdownStyle}
                >
                    {filtered.map((user) => (
                        <Button
                            key={user.id}
                            variant="custom"
                            className="w-full px-4 py-2.5 text-left hover:bg-[var(--color-primary)]/10 transition-colors border-b border-[var(--color-border)] last:border-0"
                            onMouseDown={() => {
                                setQuery(user.nombre);
                                onSelect(user);
                                setOpen(false);
                            }}
                        >
                            <Text variant="body2" weight="semibold" color="text-primary" className="block">{user.nombre}</Text>
                            <Text as="span" variant="caption" color="text-secondary" className="block mt-0.5">
                                {[user.cedula, user.cargo || user.rol, user.area].filter(Boolean).join(' · ')}
                            </Text>
                        </Button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};

export default HierarchyAutocomplete;
