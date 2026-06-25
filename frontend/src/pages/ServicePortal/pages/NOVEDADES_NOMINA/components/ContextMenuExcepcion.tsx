import React, { useEffect, useRef } from 'react';
import { ShieldOff, Undo2 } from 'lucide-react';

interface ContextMenuExcepcionProps {
    x: number;
    y: number;
    visible: boolean;
    tieneExcepcion: boolean;
    onVincular: () => void;
    onDesvincular: () => void;
    onClose: () => void;
}

const ContextMenuExcepcion: React.FC<ContextMenuExcepcionProps> = ({
    x, y, visible, tieneExcepcion, onVincular, onDesvincular, onClose
}) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (visible) {
            document.addEventListener('mousedown', handleClick);
            document.addEventListener('keydown', handleEsc);
        }
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    return (
        <div
            ref={ref}
            className="fixed z-[9999] min-w-[220px] py-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150"
            style={{ top: y, left: x }}
        >
            {!tieneExcepcion ? (
                <button
                    onClick={onVincular}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-700 dark:text-slate-200 transition-colors"
                >
                    <ShieldOff className="w-4 h-4 text-amber-500" />
                    <span>Vincular a Excepción</span>
                </button>
            ) : (
                <button
                    onClick={onDesvincular}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-200 transition-colors"
                >
                    <Undo2 className="w-4 h-4 text-blue-500" />
                    <span>Remover Excepción</span>
                </button>
            )}
        </div>
    );
};

export default ContextMenuExcepcion;
