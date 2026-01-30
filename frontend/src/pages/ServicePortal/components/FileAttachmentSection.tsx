import React from 'react';
import { Paperclip, FileText, X } from 'lucide-react';
import { Button, Title, Text, Icon, Input } from '../../../components/atoms';

interface FileAttachmentSectionProps {
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    selectedFiles: File[];
    removeFile: (index: number) => void;
}

export const FileAttachmentSection: React.FC<FileAttachmentSectionProps> = ({
    fileInputRef,
    handleFileChange,
    selectedFiles,
    removeFile
}) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                <Icon name={Paperclip} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Documentación y Adjuntos</Title>
                <div className="flex-grow border-t border-[var(--color-border)]"></div>
            </div>

            <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-[var(--color-border)] rounded-3xl bg-[var(--color-surface-variant)]/10 hover:bg-[var(--color-surface-variant)]/20 transition-all cursor-pointer group"
            >
                <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-4 bg-[var(--color-primary)]/10 rounded-2xl text-[var(--color-primary)] group-hover:scale-110 transition-transform">
                        <Paperclip size={32} />
                    </div>
                    <Text variant="body2" weight="bold">Haz clic para subir archivos o capturas</Text>
                    <Text variant="caption" color="text-secondary">Soporte para imágenes, PDF y documentos técnicos</Text>
                    <Input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                        name="archivos_adjuntos"
                    />
                </div>
            </div>

            {selectedFiles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm">
                            <div className="flex items-center space-x-3 overflow-hidden">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                                    <FileText size={18} />
                                </div>
                                <div className="overflow-hidden">
                                    <Text variant="body2" weight="bold" className="truncate block">{file.name}</Text>
                                    <Text variant="caption" color="text-secondary">{(file.size / 1024).toFixed(1)} KB</Text>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(idx)}
                                className="!p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-500 rounded-xl transition-colors"
                                icon={X}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
