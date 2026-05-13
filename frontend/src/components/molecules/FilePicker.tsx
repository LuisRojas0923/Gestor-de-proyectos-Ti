import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { Text, Input } from '../atoms';

interface FilePickerProps {
    id?: string;
    files: File[];
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    accept?: string;
    placeholder?: string;
    className?: string; // For the outer container
    size?: 'xs' | 'sm' | 'md' | 'lg';
    children?: React.ReactNode;
}

const FilePicker: React.FC<FilePickerProps> = ({
    id = "file-upload",
    files,
    onChange,
    multiple = true,
    accept = ".xlsx,.xls,.xlsm",
    placeholder = "Seleccionar...",
    className = "",
    size = 'sm',
    children
}) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Create a synthetic event that matches ChangeEvent structure
            const syntheticEvent = {
                target: {
                    files: e.dataTransfer.files,
                    id: id
                }
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
        }
    };

    return (
        <div 
            className={`relative group ${className}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <Input
                id={id}
                type="file"
                multiple={multiple}
                accept={accept}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={onChange}
            />
            {children ? children : (
                <div className={`flex items-center gap-2 rounded-lg border border-dashed transition-all cursor-pointer bg-slate-50 dark:bg-slate-900/50 overflow-hidden
                    ${isDragging ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.01]' : 'border-slate-300 dark:border-slate-600 group-hover:border-[var(--color-primary)]'}
                    ${size === 'xs' ? 'p-1' : 'p-2'}`}>
                    <Upload className={`${size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${isDragging ? 'text-[var(--color-primary)] animate-bounce' : 'text-slate-400 group-hover:text-[var(--color-primary)]'} ml-1 shrink-0`} />
                    <Text size={size === 'xs' ? 'xs' : 'sm'} color={isDragging ? 'text-primary' : 'text-secondary'} weight={isDragging ? 'bold' : 'normal'} className="truncate">
                        {isDragging ? '¡Suelta los archivos aquí!' : (files.length > 0
                            ? files.map((f: File) => f.name).join(', ')
                            : placeholder)}
                    </Text>
                </div>
            )}
        </div>
    );
};

export default FilePicker;
