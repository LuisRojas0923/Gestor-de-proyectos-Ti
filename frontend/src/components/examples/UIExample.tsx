import React, { useState } from 'react';
import {
    TrendingUp,
    Users,
    FileText,
    AlertTriangle,
    Settings
} from 'lucide-react';
import {
    Button,
    Input,
    Select,
    Switch,
    Textarea,
    MaterialCard,
    Title,
    Text
} from '../atoms';
import {
    MaterialSearchBar
} from '../molecules';

const UIExample: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
        status: 'pending',
        active: true
    });

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Formulario enviado:', formData);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Título */}
                <div>
                    <Title variant="h1" className="mb-2">
                        Sistema de Diseño Atómico
                    </Title>
                    <Text color="secondary">
                        Demostración de los componentes unificados del proyecto.
                    </Text>
                </div>

                {/* Métricas con MaterialCard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { title: 'Proyectos', value: '42', icon: FileText, color: 'text-blue-500' },
                        { title: 'Equipo', value: '28', icon: Users, color: 'text-green-500' },
                        { title: 'Progreso', value: '87%', icon: TrendingUp, color: 'text-purple-500' },
                        { title: 'Alertas', value: '3', icon: AlertTriangle, color: 'text-yellow-500' }
                    ].map((item, i) => (
                        <MaterialCard key={i} elevation={1} className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Text variant="caption" weight="medium" color="secondary">{item.title}</Text>
                                    <Text variant="h3" weight="bold">{item.value}</Text>
                                </div>
                                <item.icon className={`w-8 h-8 ${item.color}`} />
                            </div>
                        </MaterialCard>
                    ))}
                </div>

                {/* Búsqueda */}
                <div className="space-y-4">
                    <Title variant="h4">Búsqueda y Filtros</Title>
                    <div className="flex items-center space-x-4">
                        <MaterialSearchBar
                            className="flex-1"
                            placeholder="Buscar proyectos..."
                            suggestions={['Proyecto Alpha', 'Proyecto Beta', 'Módulo de Finanzas']}
                        />
                    </div>
                </div>

                {/* Formulario */}
                <MaterialCard elevation={1} className="p-6">
                    <Title variant="h4" className="mb-6">Formulario Unificado</Title>
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Nombre completo"
                                placeholder="Juan Pérez"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                            <Input
                                label="Correo electrónico"
                                type="email"
                                placeholder="juan@ejemplo.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select
                                label="Estado"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                options={[
                                    { value: 'pending', label: 'Pendiente' },
                                    { value: 'active', label: 'Activo' },
                                    { value: 'completed', label: 'Completado' }
                                ]}
                            />
                            <div className="flex items-center space-x-8 pt-8">
                                <Switch
                                    label="¿Usuario Activo?"
                                    checked={formData.active}
                                    onChange={(checked) => setFormData({ ...formData, active: checked })}
                                />
                            </div>
                        </div>

                        <Textarea
                            label="Observaciones"
                            placeholder="Escriba aquí..."
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            rows={3}
                        />

                        <div className="flex justify-end space-x-4">
                            <Button variant="outline" onClick={() => setFormData({ name: '', email: '', message: '', status: 'pending', active: true })}>
                                Limpiar
                            </Button>
                            <Button variant="primary" type="submit">
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                </MaterialCard>

                {/* Variantes de Botones */}
                <div className="space-y-4">
                    <Title variant="h4">Variantes de Botones</Title>
                    <div className="flex flex-wrap gap-4">
                        <Button variant="primary">Primary</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="danger">Danger</Button>
                        <Button variant="custom" className="bg-green-600 text-white hover:bg-green-700">Success</Button>
                        <Button variant="custom" className="bg-yellow-500 text-white hover:bg-yellow-600">Warning</Button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <Button variant="primary" size="sm">Small</Button>
                        <Button variant="primary" size="md">Medium</Button>
                        <Button variant="primary" size="lg">Large</Button>
                        <Button variant="primary" icon={Settings}>Con Icono</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UIExample;
