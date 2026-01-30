import { Input } from './index';

interface CurrencyInputProps {
    value: string | number;
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
    value,
    onChange,
    className = "",
    placeholder,
    disabled,
    size = 'md',
    ...props
}) => {
    // Formatear valor para mostrar (ej: 1,000,000)
    const formatValue = (val: string | number): string => {
        if (!val) return "";
        const numericVal = typeof val === 'string' ? parseFloat(val.replace(/[^\d.]/g, '')) : val;
        if (isNaN(numericVal)) return "";
        return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(numericVal);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Eliminar todo lo que no sea número
        const rawValue = e.target.value.replace(/\D/g, '');
        onChange(rawValue);
    };

    return (
        <Input
            {...props}
            type="text"
            className={`text-right font-mono ${className}`}
            value={formatValue(value)}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            size={size}
        />
    );
};
