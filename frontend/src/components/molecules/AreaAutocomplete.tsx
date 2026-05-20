import React, { useEffect, useState } from 'react';
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

    useEffect(() => {
        setQuery(value);
    }, [value]);

    const term = query.trim().toUpperCase();
    const filtered = (
        term
            ? options.filter(o => o.includes(term))
            : options
    ).slice(0, 8);

    const handleBlur = () => {
        setTimeout(() => {
            setOpen(false);
            const normalized = normalizeArea(query);
            setQuery(normalized);
            onChange(normalized);
        }, 150);
    };

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
                    setQuery(e.target.value);
                    onChange(e.target.value);
                }}
                onFocus={() => setOpen(true)}
                onBlur={handleBlur}
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl max-h-52 overflow-y-auto custom-scrollbar">
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
                </div>
            )}
        </div>
    );
};

export default AreaAutocomplete;
