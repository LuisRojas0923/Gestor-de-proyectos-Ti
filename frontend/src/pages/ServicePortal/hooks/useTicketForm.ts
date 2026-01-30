import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';

interface Category {
    id: string;
    form_type: 'support' | 'development' | 'asset' | 'change_control';
}

export const useTicketForm = (selectedCategory: Category, onFilesChange: React.Dispatch<React.SetStateAction<File[]>>) => {
    const [modules, setModules] = useState<any[]>([]);
    const [components, setComponents] = useState<any[]>([]);
    const [selectedModuleId, setSelectedModuleId] = useState<string>('');
    const [impactedAreas, setImpactedAreas] = useState<string[]>([]);
    const [areaInput, setAreaInput] = useState<string>('');
    const [calculatedPriority, setCalculatedPriority] = useState<string>('Media');

    useEffect(() => {
        if (selectedCategory.form_type === 'change_control') {
            const fetchModules = async () => {
                try {
                    const res = await axios.get(`${API_CONFIG.BASE_URL}/solid/modulos`);
                    setModules(res.data);
                } catch (err) {
                    console.error("Error fetching SOLID modules:", err);
                }
            };
            fetchModules();
        }
    }, [selectedCategory.form_type]);

    useEffect(() => {
        if (selectedModuleId) {
            const fetchComponents = async () => {
                try {
                    const res = await axios.get(`${API_CONFIG.BASE_URL}/solid/modulos/${selectedModuleId}/componentes`);
                    setComponents(res.data);
                } catch (err) {
                    console.error("Error fetching SOLID components:", err);
                }
            };
            fetchComponents();
        } else {
            setComponents([]);
        }
    }, [selectedModuleId]);

    const handleImpactChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const impact = e.target.value;
        let priority = 'Media';
        if (impact === 'Alto') priority = 'Alta';
        if (impact === 'Bajo') priority = 'Baja';
        setCalculatedPriority(priority);
    };

    const addArea = () => {
        if (areaInput.trim() && !impactedAreas.includes(areaInput.trim())) {
            setImpactedAreas([...impactedAreas, areaInput.trim()]);
            setAreaInput('');
        }
    };

    const removeArea = (area: string) => {
        setImpactedAreas(impactedAreas.filter(a => a !== area));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            onFilesChange(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        onFilesChange(prev => prev.filter((_, i) => i !== index));
    };

    return {
        modules,
        components,
        selectedModuleId,
        setSelectedModuleId,
        impactedAreas,
        areaInput,
        setAreaInput,
        calculatedPriority,
        setCalculatedPriority,
        handleImpactChange,
        addArea,
        removeArea,
        handleFileChange,
        removeFile
    };
};
