import React, { useEffect, useState } from 'react';
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
    ).slice(0, 8);

    return (
        <div className="w-full relative">
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
                onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl max-h-52 overflow-y-auto custom-scrollbar">
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
                            <Text variant="body2" weight="semibold" color="text-primary">{user.nombre}</Text>
                            <Text as="span" variant="caption" color="text-secondary">
                                {[user.cedula, user.cargo || user.rol, user.area].filter(Boolean).join(' · ')}
                            </Text>
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HierarchyAutocomplete;
