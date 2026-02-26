import React from 'react';
import { Plus } from 'lucide-react';

import imgHardware from '../../assets/images/categories/Soporte Hardware.png';
import imgSoftware from '../../assets/images/categories/Soporte Software.png';
import imgPerifericos from '../../assets/images/categories/Soporte Perifericos.png';
import imgImpresora from '../../assets/images/categories/Soporte Impresora.png';
import imgMejora from '../../assets/images/categories/Soporte Mejoramiento.png';
import imgDesarrollo from '../../assets/images/categories/Nuevos desarrollos.png';
import imgLicencias from '../../assets/images/categories/Compra de Licencias.png';
import imgControlCambios from '../../assets/images/categories/Control de Cambios.png';

export const categoryMetadata: Record<string, { icon: React.ReactNode; section: 'soporte' | 'mejoramiento' }> = {
    soporte_hardware: {
        icon: <img src={imgHardware} alt="Hardware" className="w-full h-full object-contain p-1" />,
        section: 'soporte'
    },
    soporte_software: {
        icon: <img src={imgSoftware} alt="Software" className="w-full h-full object-contain p-1" />,
        section: 'soporte'
    },
    soporte_impresoras: {
        icon: <img src={imgImpresora} alt="Impresoras" className="w-full h-full object-contain p-1" />,
        section: 'soporte'
    },
    perifericos: {
        icon: <img src={imgPerifericos} alt="Periféricos" className="w-full h-full object-contain p-1" />,
        section: 'soporte'
    },
    compra_licencias: {
        icon: <img src={imgLicencias} alt="Licencias" className="w-full h-full object-contain p-1" />,
        section: 'soporte'
    },
    nuevos_desarrollos_mejora: {
        icon: <img src={imgDesarrollo} alt="Nuevas Herramientas" className="w-full h-full object-contain p-2" />,
        section: 'mejoramiento'
    },
    control_cambios: {
        icon: <img src={imgControlCambios} alt="Control de Cambios" className="w-full h-full object-contain p-1" />,
        section: 'mejoramiento'
    },
    soporte_mejora: {
        icon: <img src={imgMejora} alt="Soporte Mejoramiento" className="w-full h-full object-contain p-1" />,
        section: 'mejoramiento'
    },
    nuevos_desarrollos_solid: {
        icon: <img src={imgDesarrollo} alt="Desarrollo SOLID" className="w-full h-full object-contain p-2" />,
        section: 'mejoramiento'
    }
};

export const getCategoryIcon = (id: string) => {
    return categoryMetadata[id]?.icon || <Plus />;
};

export const getCategorySection = (id: string): 'soporte' | 'mejoramiento' => {
    return categoryMetadata[id]?.section || 'soporte';
};
