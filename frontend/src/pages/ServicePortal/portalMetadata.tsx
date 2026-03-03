import React from 'react';
import {
    Plus,
    Cpu,
    AppWindow,
    Printer,
    Keyboard,
    Key,
    Code2,
    GitCommit,
    Lightbulb,
    Layers
} from 'lucide-react';

export const categoryMetadata: Record<string, { icon: React.ReactNode; section: 'soporte' | 'mejoramiento' }> = {
    soporte_hardware: {
        icon: <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-blue-500/10"><Cpu className="w-8 h-8 text-blue-500" /></div>,
        section: 'soporte'
    },
    soporte_software: {
        icon: <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-indigo-500/10"><AppWindow className="w-8 h-8 text-indigo-500" /></div>,
        section: 'soporte'
    },
    soporte_impresoras: {
        icon: <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-cyan-500/10"><Printer className="w-8 h-8 text-cyan-500" /></div>,
        section: 'soporte'
    },
    perifericos: {
        icon: <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-teal-500/10"><Keyboard className="w-8 h-8 text-teal-500" /></div>,
        section: 'soporte'
    },
    compra_licencias: {
        icon: <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-amber-500/10"><Key className="w-8 h-8 text-amber-500" /></div>,
        section: 'soporte'
    },
    nuevos_desarrollos_mejora: {
        icon: <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-purple-500/10"><Code2 className="w-8 h-8 text-purple-500" /></div>,
        section: 'mejoramiento'
    },
    control_cambios: {
        icon: <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-rose-500/10"><GitCommit className="w-8 h-8 text-rose-500" /></div>,
        section: 'mejoramiento'
    },
    soporte_mejora: {
        icon: <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-yellow-500/10"><Lightbulb className="w-8 h-8 text-yellow-500" /></div>,
        section: 'mejoramiento'
    },
    nuevos_desarrollos_solid: {
        icon: <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-emerald-500/10"><Layers className="w-8 h-8 text-emerald-500" /></div>,
        section: 'mejoramiento'
    }
};

export const getCategoryIcon = (id: string) => {
    return categoryMetadata[id]?.icon || <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-gray-500/10"><Plus className="w-8 h-8 text-gray-500" /></div>;
};

export const getCategorySection = (id: string): 'soporte' | 'mejoramiento' => {
    return categoryMetadata[id]?.section || 'soporte';
};
