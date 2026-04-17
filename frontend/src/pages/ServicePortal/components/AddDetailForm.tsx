import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, FileUp } from 'lucide-react';
import { Button, Text, Icon, Textarea, Input } from '../../../components/atoms';

interface AddDetailFormProps {
    onAddDetail: (text: string) => Promise<void>;
    onUploadFile: (file: File) => Promise<void>;
    isSaving: boolean;
}

const AddDetailForm: React.FC<AddDetailFormProps> = ({ onAddDetail, onUploadFile, isSaving }) => {
    const [text, setText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() && !selectedFile) return;

        try {
            if (text.trim()) {
                await onAddDetail(text);
                setText('');
            }
            if (selectedFile) {
                await onUploadFile(selectedFile);
                setSelectedFile(null);
            }
        } catch (err) {
            console.error("Error submitting detail:", err);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500 rounded-xl text-white">
                    <Icon name={FileUp} size="sm" />
                </div>
                <div>
                    <Text variant="body2" weight="bold" className="text-slate-900 dark:text-white">
                        ¿Deseas agregar más información?
                    </Text>
                    <Text variant="caption" color="text-secondary">
                        Añade detalles técnicos o adjunta evidencias adicionales.
                    </Text>
                </div>
            </div>

            <div className="relative">
                <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Escribe aquí los detalles adicionales..."
                    className="min-h-[100px] !text-sm resize-none custom-scrollbar"
                    disabled={isSaving}
                    rows={4}
                />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        icon={Paperclip}
                        disabled={isSaving}
                        className="text-blue-600 hover:bg-blue-50"
                    >
                        Adjuntar Archivo
                    </Button>

                    {selectedFile && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 rounded-full border border-blue-200 dark:border-blue-800 animate-in fade-in zoom-in">
                            <Text variant="caption" weight="bold" className="text-blue-700 dark:text-blue-300 max-w-[150px] truncate">
                                {selectedFile.name}
                            </Text>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFile(null)}
                                className="!p-1 h-auto text-blue-500 hover:text-blue-700 transition-colors"
                                icon={X}
                            />
                        </div>
                    )}
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    disabled={isSaving || (!text.trim() && !selectedFile)}
                    isLoading={isSaving}
                    icon={Send}
                    className="shadow-lg shadow-blue-500/20"
                >
                    Enviar Ampliación
                </Button>
            </div>
        </form>
    );
};

export default AddDetailForm;
