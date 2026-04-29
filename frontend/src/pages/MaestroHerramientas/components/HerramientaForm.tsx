import React, { useState, useEffect } from 'react';
import { Input, Select, Textarea, Button } from '../../../components/atoms';
import { Save, X } from 'lucide-react';
import { HerramientaInformatica } from '../../../types/herramientas';
import { herramientasService } from '../../../services/herramientasService';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

interface Props {
    herramienta: HerramientaInformatica | null;
    onSuccess: () => void;
    onCancel: () => void;
}

const DEPARTAMENTOS = [
    { value: 'Gestión Humana', label: 'Gestión Humana' },
    { value: 'Control interno', label: 'Control interno' },
    { value: 'Sistemas', label: 'Sistemas' },
    { value: 'Contabilidad', label: 'Contabilidad' },
    { value: 'Operaciones', label: 'Operaciones' }
];

const ECOSISTEMAS = [
    { value: 'Nomina', label: 'Nomina' },
    { value: 'Excel', label: 'Excel' },
    { value: 'Web', label: 'Web' },
    { value: 'Desktop', label: 'Desktop' },
    { value: 'ETL', label: 'ETL' }
];

const ESTADOS = [
    { value: 'Activa', label: 'Activa' },
    { value: 'Inactiva', label: 'Inactiva' },
    { value: 'En Desarrollo', label: 'En Desarrollo' }
];

const HerramientaForm: React.FC<Props> = ({ herramienta, onSuccess, onCancel }) => {
    const { addNotification } = useNotifications();
    const [isLoading, setIsLoading] = useState(false);
    // Normalizar nulos a cadenas vacías para evitar advertencias de inputs controlados
    const normalizeData = (data: any) => {
        return Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, v === null ? '' : v])
        );
    };

    const [formData, setFormData] = useState<Partial<HerramientaInformatica>>(
        herramienta 
            ? normalizeData(herramienta)
            : {
                nombre: '',
                descripcion: '',
                funcionalidad: '',
                responsable: '',
                departamento: '',
                estado: 'Activa',
                version: '1.0.0',
                ubicacion_archivo: '',
                fallas_comunes: '',
                fuentes: '',
                observaciones: '',
                ecosistema: 'Excel'
            }
    );

    useEffect(() => {
        if (herramienta) {
            setFormData(normalizeData(herramienta));
        }
    }, [herramienta]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (herramienta?.id) {
                await herramientasService.update(herramienta.id, formData);
                addNotification('success', 'Herramienta actualizada con éxito');
            } else {
                await herramientasService.create(formData as HerramientaInformatica);
                addNotification('success', 'Herramienta creada con éxito');
            }
            onSuccess();
        } catch (error) {
            addNotification('error', 'Error al guardar los cambios');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Nombre de la Herramienta"
                    value={formData.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    required
                />
                <Input
                    label="Responsable"
                    value={formData.responsable}
                    onChange={(e) => handleChange('responsable', e.target.value)}
                />
                <Select
                    label="Departamento"
                    value={formData.departamento}
                    options={DEPARTAMENTOS}
                    onChange={(v) => handleChange('departamento', v)}
                />
                <Select
                    label="Ecosistema"
                    value={formData.ecosistema}
                    options={ECOSISTEMAS}
                    onChange={(v) => handleChange('ecosistema', v)}
                />
                <Select
                    label="Estado"
                    value={formData.estado}
                    options={ESTADOS}
                    onChange={(v) => handleChange('estado', v)}
                />
                <Input
                    label="Versión"
                    value={formData.version}
                    onChange={(e) => handleChange('version', e.target.value)}
                />
            </div>

            <div className="space-y-4">
                <Textarea
                    label="Descripción"
                    value={formData.descripcion}
                    onChange={(e) => handleChange('descripcion', e.target.value)}
                    rows={2}
                />
                <Textarea
                    label="Funcionalidad Principal"
                    value={formData.funcionalidad}
                    onChange={(e) => handleChange('funcionalidad', e.target.value)}
                    rows={2}
                />
                <Input
                    label="Ubicación del Archivo / URL"
                    value={formData.ubicacion_archivo}
                    onChange={(e) => handleChange('ubicacion_archivo', e.target.value)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Textarea
                        label="Fallas Comunes"
                        value={formData.fallas_comunes}
                        onChange={(e) => handleChange('fallas_comunes', e.target.value)}
                    />
                    <Textarea
                        label="Observaciones"
                        value={formData.observaciones}
                        onChange={(e) => handleChange('observaciones', e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <Button type="button" variant="ghost" onClick={onCancel} icon={X}>
                    Cancelar
                </Button>
                <Button type="submit" variant="primary" loading={isLoading} icon={Save}>
                    {herramienta ? 'Guardar Cambios' : 'Crear Herramienta'}
                </Button>
            </div>
        </form>
    );
};

export default HerramientaForm;
