import React from 'react';
import { Upload } from 'lucide-react';
import { Text } from '../atoms';

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
    return (
        <div className={`relative group ${className}`}>
            <input
                id={id}
                type="file"
                multiple={multiple}
                accept={accept}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={onChange}
            />
            {children ? children : (
                <div className={`flex items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 group-hover:border-[var(--color-primary)] transition-colors cursor-pointer bg-slate-50 dark:bg-slate-900/50 overflow-hidden
                    ${size === 'xs' ? 'p-1' : 'p-2'}`}>
                    <Upload className={`${size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-slate-400 group-hover:text-[var(--color-primary)] ml-1 shrink-0`} />
                    <Text size={size === 'xs' ? 'xs' : 'sm'} color="text-secondary" className="truncate">
                        {files.length > 0
                            ? files.map((f: File) => f.name).join(', ')
                            : placeholder}
                    </Text>
                </div>
            )}
        </div>
    );
};

export default FilePicker;
