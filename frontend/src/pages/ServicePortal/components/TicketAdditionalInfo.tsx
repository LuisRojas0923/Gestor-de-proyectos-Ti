import React from 'react';
import { Text } from '../../../components/atoms';
import { formatFriendlyDate } from '../../../utils/dateUtils';

interface Ampliacion {
    texto: string;
    usuario_nombre?: string;
    fecha: string;
}

interface TicketAdditionalInfoProps {
    ampliaciones: Ampliacion[];
}

const TicketAdditionalInfo: React.FC<TicketAdditionalInfoProps> = ({ ampliaciones: rawAmpliaciones }) => {
    // Robustez: Si llega como string (JSON), lo parseamos. Si no es array, lo manejamos.
    const ampliaciones = React.useMemo(() => {
        if (!rawAmpliaciones) return [];
        try {
            const parsed = typeof rawAmpliaciones === 'string' 
                ? JSON.parse(rawAmpliaciones) 
                : rawAmpliaciones;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Error parseando ampliaciones:", e);
            return [];
        }
    }, [rawAmpliaciones]);

    if (ampliaciones.length === 0) {
        return (
            <div className="bg-slate-50 dark:bg-slate-900/10 p-6 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <Text variant="caption" color="text-secondary" className="italic">
                    No hay ampliaciones registradas.
                </Text>
            </div>
        );
    }

    const parsedAmpliaciones = [...ampliaciones].reverse();

    return (
        <div className="max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-gradient-to-b before:from-blue-500/40 before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                {parsedAmpliaciones.map((amp, index) => (
                    <div 
                        key={index} 
                        className={`relative animate-in slide-in-from-left-4 duration-500 ${
                            index === 0 ? 'delay-0' : 
                            index === 1 ? 'delay-100' : 
                            index === 2 ? 'delay-200' : 
                            'delay-300'
                        }`}
                    >
                        {/* Indicador de punto en la línea */}
                        <div className="absolute -left-[25px] top-1 w-5 h-5 bg-white dark:bg-slate-950 rounded-full border-2 border-blue-500 shadow-sm z-10 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        </div>

                        {/* Tarjeta de Información */}
                        <div className="bg-white dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between gap-4 mb-2">
                                <div className="flex items-center gap-2">
                                    <Text variant="caption" weight="bold" className="text-blue-600 dark:text-blue-400 !text-[10px] uppercase">
                                        {amp.usuario_nombre || 'Usuario'}
                                    </Text>
                                </div>
                                <Text variant="caption" className="!text-[9px] text-slate-400">
                                    {formatFriendlyDate(amp.fecha)}
                                </Text>
                            </div>
                            
                            <Text variant="body2" className="leading-relaxed text-[13px] whitespace-pre-line">
                                {amp.texto}
                            </Text>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TicketAdditionalInfo;
