import React, { useState } from 'react';
import {
    Text,
    Title,
    Subtitle,
    Button,
    Input,
    Select,
    Textarea,
    Switch,
    Checkbox,
    Badge,
    MaterialCard,
    Icon
} from '../components/atoms';
import { ActionCard, ServiceCard, Modal, DeleteConfirmModal } from '../components/molecules';
import {
    Type,
    MousePointer2,
    Layout,
    CheckCircle2,
    AlertCircle,
    Search,
    BookOpen,
    Palette,
    Bell,
    Star,
    Info,
    CheckCircle,
    XCircle,
    Settings,
    User,
    Calendar,
    Cloud,
    Monitor,
    Plus
} from 'lucide-react';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { materialDesignTokens } from '../components/tokens';

const DesignSystemCatalog: React.FC = () => {
    const { addNotification } = useNotifications();
    const [activeTab, setActiveTab] = useState<'typography' | 'buttons' | 'forms' | 'icons' | 'feedback' | 'colors' | 'notifications' | 'modals' | 'cards'>('typography');

    // States for interactive demos
    const [switchVal, setSwitchVal] = useState(false);
    const [checkVal, setCheckVal] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [selectVal, setSelectVal] = useState('');

    // Modal states
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const renderTabButton = (id: typeof activeTab, label: string, icon: React.ReactNode) => (
        <Button
            variant={activeTab === id ? 'primary' : 'ghost'}
            onClick={() => setActiveTab(id)}
            className="justify-start font-medium"
            fullWidth
        >
            <div className="flex items-center gap-3">
                {icon}
                <Text color="inherit" weight={activeTab === id ? 'bold' : 'medium'}>{label}</Text>
            </div>
        </Button>
    );

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/20">
                    <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                    <Title variant="h2" color="text-primary">
                        Catálogo de Sistema de Diseño
                    </Title>
                    <Subtitle variant="body1">
                        Documentación interactiva de los átomos y moléculas del proyecto.
                    </Subtitle>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-1">
                    <MaterialCard className="p-4 sticky top-6 border-[var(--color-border)]/30 shadow-xl overflow-hidden">
                        <div className="space-y-1">
                            <Text variant="caption" weight="bold" color="text-secondary" className="px-4 mb-4 uppercase tracking-[0.2em] block">
                                Componentes
                            </Text>
                            {renderTabButton('typography', 'Tipografía', <Type size={20} />)}
                            {renderTabButton('buttons', 'Botones', <MousePointer2 size={20} />)}
                            {renderTabButton('forms', 'Formularios', <Layout size={20} />)}
                            {renderTabButton('icons', 'Iconos', <Star size={20} />)}
                            {renderTabButton('feedback', 'Feedback', <CheckCircle2 size={20} />)}
                            <div className="my-4 border-t border-neutral-200 dark:border-neutral-700 opacity-50" />
                            {renderTabButton('colors', 'Colores', <Palette size={20} />)}
                            {renderTabButton('notifications', 'Notificaciones', <Bell size={20} />)}
                            {renderTabButton('modals', 'Modales', <Layout size={18} />)}
                            {renderTabButton('cards', 'Tarjetas', <BookOpen size={18} />)}
                        </div>
                    </MaterialCard>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3 space-y-8">

                    {/* Typography Section */}
                    {activeTab === 'typography' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <MaterialCard className="p-8">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-6 mb-8">
                                    <Title variant="h4">Escala Tipográfica</Title>
                                    <Subtitle variant="body1">Componentes: {'<Title />, <Subtitle />, <Text />'}</Subtitle>
                                </div>

                                <div className="space-y-10">
                                    <div className="space-y-4">
                                        <Title variant="h5" color="primary">Variantes de Título</Title>
                                        <div className="grid gap-4">
                                            <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                                <Title variant="h1">Header 1 (30px)</Title>
                                                <Text variant="caption" color="text-secondary">{'<Title variant="h1" />'}</Text>
                                            </div>
                                            <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                                <Title variant="h2">Header 2 (24px)</Title>
                                                <Text variant="caption" color="text-secondary">{'<Title variant="h2" />'}</Text>
                                            </div>
                                            <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                                <Title variant="h3">Header 3 (20px)</Title>
                                                <Text variant="caption" color="text-secondary">{'<Title variant="h3" />'}</Text>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Subtitle variant="h5" color="primary">Variantes de Subtítulo</Subtitle>
                                        <div className="grid gap-4">
                                            <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                                <Subtitle variant="h4">Subtitle 1 (Header 4 size + Medium Weight)</Subtitle>
                                                <Text variant="caption" color="text-secondary">{'<Subtitle variant="h4" />'}</Text>
                                            </div>
                                            <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                                <Subtitle variant="h5">Subtitle 2 (Standard)</Subtitle>
                                                <Text variant="caption" color="text-secondary">{'<Subtitle variant="h5" />'}</Text>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Subtitle variant="h5" color="primary">Variantes de Texto</Subtitle>
                                        <div className="grid gap-4">
                                            <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                                <Text variant="body1">Body 1 (16px) - El texto estándar para párrafos y contenido general.</Text>
                                                <Text variant="caption" color="text-secondary">{'<Text variant="body1" />'}</Text>
                                            </div>
                                            <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                                <Text variant="body2">Body 2 (14px) - Texto compacto para nubes de etiquetas o listas densas.</Text>
                                                <Text variant="caption" color="text-secondary">{'<Text variant="body2" />'}</Text>
                                            </div>
                                            <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                                <Text variant="caption">Caption (12px) - Texto auxiliar, metadatos o hints.</Text>
                                                <Text variant="caption" color="text-secondary">{'<Text variant="caption" />'}</Text>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </MaterialCard>

                            <MaterialCard className="p-8">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-6 mb-8">
                                    <Title variant="h4">Pesos y Colores</Title>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-4">
                                        <Subtitle variant="h6" className="mb-4">Pesos de Fuente</Subtitle>
                                        <Text weight="light">Light Weight</Text>
                                        <Text weight="normal">Normal Weight</Text>
                                        <Text weight="medium">Medium Weight</Text>
                                        <Text weight="semibold">Semibold Weight</Text>
                                        <Text weight="bold">Bold Weight</Text>
                                    </div>
                                    <div className="space-y-4">
                                        <Subtitle variant="h6" className="mb-4">Colores de Texto</Subtitle>
                                        <Text color="text-primary">Color Primary (Predeterminado)</Text>
                                        <Text color="text-secondary">Color Secondary (Gris suave)</Text>
                                        <Text color="primary">Brand Primary (Azul corporativo)</Text>
                                        <Text color="error">Status Error</Text>
                                        <Text color="success">Status Success</Text>
                                        <Text color="warning">Status Warning</Text>
                                    </div>
                                </div>
                            </MaterialCard>
                        </div>
                    )}

                    {/* Buttons Section */}
                    {activeTab === 'buttons' && (
                        <div className="space-y-6">
                            <MaterialCard className="p-6">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                                    <Text variant="h5" weight="bold">Variantes</Text>
                                    <Text variant="body2" color="text-secondary">Componente: {'<Button />'}</Text>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <Button variant="primary">Primary</Button>
                                    <Button variant="secondary">Secondary</Button>
                                    <Button variant="outline">Outline</Button>
                                    <Button variant="ghost">Ghost</Button>
                                    <Button variant="danger">Danger</Button>
                                </div>
                            </MaterialCard>

                            <MaterialCard className="p-6">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                                    <Text variant="h5" weight="bold">Tamaños e Iconos</Text>
                                </div>
                                <div className="space-y-8">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <Button size="xs" variant="primary">Extra Small</Button>
                                        <Button size="sm" variant="primary">Small</Button>
                                        <Button size="md" variant="primary">Medium</Button>
                                        <Button size="lg" variant="primary">Large</Button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <Button icon={Search}>Con Icono</Button>
                                        <Button icon={Search} iconPosition="right">Icono Derecha</Button>
                                        <Button loading>Cargando</Button>
                                        <Button disabled>Deshabilitado</Button>
                                    </div>
                                </div>
                            </MaterialCard>
                        </div>
                    )}

                    {/* Forms Section */}
                    {activeTab === 'forms' && (
                        <div className="space-y-6">
                            <MaterialCard className="p-6">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                                    <Text variant="h5" weight="bold">Inputs y Selects</Text>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Input de Texto"
                                        placeholder="Escribe algo..."
                                        value={inputVal}
                                        onChange={(e) => setInputVal(e.target.value)}
                                        helperText="Texto de ayuda auxiliar"
                                    />
                                    <Input
                                        type="password"
                                        label="Input Contraseña (con Toggle)"
                                        placeholder="Ingresa tu contraseña"
                                    />
                                    <Input
                                        label="Input con Icono"
                                        placeholder="Buscar..."
                                        icon={Search}
                                    />
                                    <Input
                                        label="Con Error"
                                        placeholder="Valor inválido"
                                        error
                                        errorMessage="Este campo es requerido"
                                    />
                                    <Select
                                        label="Selección"
                                        options={[
                                            { value: 'op1', label: 'Opción 1' },
                                            { value: 'op2', label: 'Opción 2' },
                                            { value: 'op3', label: 'Opción 3' },
                                        ]}
                                        value={selectVal}
                                        onChange={(e) => setSelectVal(e.target.value)}
                                    />
                                </div>
                            </MaterialCard>

                            <MaterialCard className="p-6">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                                    <Text variant="h5" weight="bold">Textarea & Toggles</Text>
                                </div>
                                <div className="space-y-6">
                                    <Textarea
                                        label="Área de Texto"
                                        placeholder="Escribe una descripción larga..."
                                        rows={3}
                                    />
                                    <div className="flex flex-wrap gap-8 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                        <Switch
                                            label="Interruptor (Switch)"
                                            checked={switchVal}
                                            onChange={setSwitchVal}
                                        />
                                        <Checkbox
                                            label="Casilla (Checkbox)"
                                            checked={checkVal}
                                            onChange={(e) => setCheckVal(e.target.checked)}
                                        />
                                    </div>
                                </div>
                            </MaterialCard>
                        </div>
                    )}
                    {/* Icons Section */}
                    {activeTab === 'icons' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <MaterialCard className="p-8">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-6 mb-8">
                                    <Title variant="h4">Sistema de Iconos</Title>
                                    <Subtitle variant="body1">Componente: {'<Icon name={...} />'}</Subtitle>
                                </div>

                                <div className="space-y-10">
                                    <div className="space-y-4">
                                        <Title variant="h5" color="primary">Escala de Tamaños</Title>
                                        <Text variant="body2" className="mb-4">Tamaños predefinidos en el sistema de diseño (tokens de material-design.ts).</Text>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                            {[
                                                { label: 'XS (12px)', size: 'xs' as const },
                                                { label: 'SM (16px)', size: 'sm' as const },
                                                { label: 'MD (20px)', size: 'md' as const },
                                                { label: 'LG (24px)', size: 'lg' as const },
                                                { label: 'XL (32px)', size: 'xl' as const },
                                                { label: 'XXL (48px)', size: 'xxl' as const },
                                            ].map((item) => (
                                                <div key={item.size} className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex flex-col items-center gap-3">
                                                    <div className="bg-white dark:bg-neutral-800 p-2 rounded-lg shadow-sm">
                                                        <Icon name={Star} size={item.size} color="primary" />
                                                    </div>
                                                    <Text variant="caption" weight="bold">{item.label}</Text>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Title variant="h5" color="secondary">Colores Temáticos</Title>
                                        <div className="flex flex-wrap gap-6 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                            <Icon name={Info} color="primary" size="lg" />
                                            <Icon name={CheckCircle} color="success" size="lg" />
                                            <Icon name={XCircle} color="error" size="lg" />
                                            <Icon name={AlertCircle} color="warning" size="lg" />
                                            <Icon name={Settings} color="text-secondary" size="lg" />
                                            <Icon name={User} color="secondary" size="lg" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Title variant="h5" className="text-indigo-500">Uso Versátil</Title>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-800 flex items-center gap-4">
                                                <Icon name={Calendar} color="primary" size="xl" className="bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg" />
                                                <div>
                                                    <Text weight="bold">Eventos Próximos</Text>
                                                    <Text variant="caption" color="text-secondary">Icono XL con fondo</Text>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-800 flex items-center gap-4">
                                                <Icon name={Cloud} color="secondary" size="xl" className="bg-secondary-50 dark:bg-secondary-900/20 p-2 rounded-lg" />
                                                <div>
                                                    <Text weight="bold">Almacenamiento</Text>
                                                    <Text variant="caption" color="text-secondary">Icono XL con fondo secundario</Text>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-[var(--color-surface-variant)] rounded-2xl border border-[var(--color-border)]">
                                        <Title variant="h6" className="mb-3">¿Cómo agregar un nuevo tamaño?</Title>
                                        <Text variant="body2" className="mb-4">
                                            Para agregar un nuevo tamaño predefinido, debes actualizar el objeto <code className="bg-black/10 dark:bg-white/10 px-1 rounded">icon.size</code> en el archivo <code className="text-primary-600 dark:text-primary-400">material-design.ts</code>:
                                        </Text>
                                        <pre className="font-mono text-xs p-4 bg-neutral-900 text-green-400 rounded-xl overflow-x-auto">
                                            {`// material-design.ts
icon: {
  size: {
    // ... existentes
    huge: 64, // Nuevo tamaño
  }
}`}
                                        </pre>
                                    </div>
                                </div>
                            </MaterialCard>
                        </div>
                    )}

                    {/* Feedback Section */}
                    {activeTab === 'feedback' && (
                        <div className="space-y-6">
                            <MaterialCard className="p-6">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                                    <Text variant="h5" weight="bold">Badges (Etiquetas)</Text>
                                    <Text variant="body2" color="text-secondary">Componente: {'<Badge />'}</Text>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <Badge variant="default">Default</Badge>
                                    <Badge variant="success">Success</Badge>
                                    <Badge variant="warning">Warning</Badge>
                                    <Badge variant="error">Error</Badge>
                                    <Badge variant="info">Info</Badge>
                                </div>
                            </MaterialCard>

                            <MaterialCard className="p-6">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                                    <Text variant="h5" weight="bold">Tarjetas</Text>
                                    <Text variant="body2" color="text-secondary">Componente: {'<MaterialCard />'}</Text>
                                </div>
                                <MaterialCard className="bg-primary-50 dark:bg-[var(--color-primary)]/10 border-primary-100 dark:border-[var(--color-primary)]/20">
                                    <div className="p-4">
                                        <div className="flex items-center gap-3">
                                            <Icon name={AlertCircle} color="primary" />
                                            <Text weight="medium" color="primary">
                                                Este contenedor es un MaterialCard. Úsalo para agrupar contenido relacionado.
                                            </Text>
                                        </div>
                                    </div>
                                </MaterialCard>
                            </MaterialCard>
                        </div>
                    )}


                    {/* Colors Section */}
                    {activeTab === 'colors' && (
                        <div className="space-y-6">
                            <MaterialCard className="p-6">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                                    <Text variant="h5" weight="bold">Colors: Base</Text>
                                    <Text variant="body2" color="text-secondary">Tokens: Primary & Secondary</Text>
                                </div>
                                <div className="space-y-8">
                                    <div>
                                        <Text variant="subtitle2" className="mb-4 uppercase tracking-wider">Primary</Text>
                                        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
                                            {Object.entries(materialDesignTokens.colors.primary).map(([key, value]) => (
                                                <div key={key} className="space-y-1">
                                                    <div
                                                        className="h-12 w-full rounded-lg shadow-sm"
                                                        style={{ backgroundColor: value }}
                                                    />
                                                    <div className="text-center">
                                                        <span className="text-xs font-mono block text-[var(--color-text-secondary)]">{key}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <Text variant="subtitle2" className="mb-4 uppercase tracking-wider">Secondary</Text>
                                        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
                                            {Object.entries(materialDesignTokens.colors.secondary).map(([key, value]) => (
                                                <div key={key} className="space-y-1">
                                                    <div
                                                        className="h-12 w-full rounded-lg shadow-sm"
                                                        style={{ backgroundColor: value }}
                                                    />
                                                    <div className="text-center">
                                                        <span className="text-xs font-mono block text-[var(--color-text-secondary)]">{key}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </MaterialCard>

                            <MaterialCard className="p-6">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                                    <Text variant="h5" weight="bold">Colors: Semantic</Text>
                                    <Text variant="body2" color="text-secondary">Status: Success, Warning, Error</Text>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900">
                                        <div className="h-8 w-8 rounded-full bg-green-500 mb-2" />
                                        <Text weight="medium">Success</Text>
                                        <Text variant="caption" className="font-mono">{materialDesignTokens.colors.semantic.success}</Text>
                                    </div>
                                    <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900">
                                        <div className="h-8 w-8 rounded-full bg-yellow-500 mb-2" />
                                        <Text weight="medium">Warning</Text>
                                        <Text variant="caption" className="font-mono">{materialDesignTokens.colors.semantic.warning}</Text>
                                    </div>
                                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900">
                                        <div className="h-8 w-8 rounded-full bg-red-500 mb-2" />
                                        <Text weight="medium">Error</Text>
                                        <Text variant="caption" className="font-mono">{materialDesignTokens.colors.semantic.error}</Text>
                                    </div>
                                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900">
                                        <div className="h-8 w-8 rounded-full bg-blue-500 mb-2" />
                                        <Text weight="medium">Info</Text>
                                        <Text variant="caption" className="font-mono">primary-light</Text>
                                    </div>
                                </div>
                            </MaterialCard>
                        </div>
                    )}

                    {/* Notifications Section */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <MaterialCard className="p-6">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                                    <Text variant="h5" weight="bold">Toast Notifications</Text>
                                    <Text variant="body2" color="text-secondary">Hook: {'useNotifications()'}</Text>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Button
                                        variant="outline"
                                        className="border-green-200 hover:bg-green-50 text-green-700 dark:border-green-800 dark:hover:bg-green-900/20 dark:text-green-400"
                                        onClick={() => addNotification('success', 'Operación completada exitosamente')}
                                    >
                                        Trigger Success
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-red-200 hover:bg-red-50 text-red-700 dark:border-red-800 dark:hover:bg-red-900/20 dark:text-red-400"
                                        onClick={() => addNotification('error', 'Ha ocurrido un error al procesar')}
                                    >
                                        Trigger Error
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-yellow-200 hover:bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:hover:bg-yellow-900/20 dark:text-yellow-400"
                                        onClick={() => addNotification('warning', 'Advertencia: Revise los datos')}
                                    >
                                        Trigger Warning
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-800 dark:hover:bg-blue-900/20 dark:text-blue-400"
                                        onClick={() => addNotification('info', 'Nueva actualización disponible')}
                                    >
                                        Trigger Info
                                    </Button>
                                </div>

                                <div className="mt-8 p-4 bg-[var(--color-surface-variant)] rounded-lg border border-[var(--color-border)]">
                                    <Text variant="subtitle2" className="mb-2">Usage Example:</Text>
                                    <pre className="font-mono text-xs overflow-x-auto p-2 bg-[var(--color-background)] rounded text-[var(--color-text-primary)]">
                                        {`const { addNotification } = useNotifications();
 
 // Call specific variant
 addNotification('success', 'Message here');
 addNotification('error', 'Error description');`}
                                    </pre>
                                </div>
                            </MaterialCard>
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'modals' && (
                <div className="space-y-8">
                    <section className="space-y-4">
                        <Title variant="h4">Modales del Sistema</Title>
                        <MaterialCard className="p-6 space-y-4">
                            <Title variant="h6" weight="medium">Modales Globales</Title>
                            <div className="flex flex-wrap gap-4">
                                <Button onClick={() => setShowDemoModal(true)}>
                                    Modal Genérico
                                </Button>
                                <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                                    Modal de Confirmación
                                </Button>
                            </div>
                        </MaterialCard>

                        <MaterialCard className="p-6 space-y-4">
                            <Title variant="h6" weight="medium">Modales de Actividad (Organismos)</Title>
                            <Text>
                                Los modales de actividad son organismos complejos que gestionan flujos de múltiples pasos.
                                Se importan desde <code>components/organisms/activities</code>.
                            </Text>
                            <div className="flex flex-wrap gap-4">
                                <Button variant="secondary" disabled>
                                    Ver ActivityCreateModal (Requiere Contexto)
                                </Button>
                            </div>
                        </MaterialCard>
                    </section>
                </div>
            )}

            {activeTab === 'cards' && (
                <div className="space-y-8">
                    <section className="space-y-4">
                        <Title variant="h4">Tarjetas de Acción</Title>
                        <MaterialCard className="p-6 space-y-6">
                            <div>
                                <Title variant="h6" className="mb-4">Action Card (Principal)</Title>
                                <div className="max-w-md">
                                    <ActionCard
                                        title="Solicitar Servicio"
                                        description="Crea un nuevo ticket de soporte, desarrollo o activos."
                                        icon={Plus}
                                        onClick={() => addNotification('info', 'Click en Action Card')}
                                    />
                                </div>
                            </div>

                            <div>
                                <Title variant="h6" className="mb-4">Service Card (Categoría)</Title>
                                <div className="max-w-md">
                                    <ServiceCard
                                        title="Soporte Hardware"
                                        description="Problemas físicos: PC, laptop, impresora."
                                        icon={<Monitor size={24} />}
                                        onClick={() => addNotification('info', 'Click en Service Card')}
                                    />
                                </div>
                            </div>
                        </MaterialCard>
                    </section>
                </div>
            )}

            {/* Demo Modals */}
            <Modal
                isOpen={showDemoModal}
                onClose={() => setShowDemoModal(false)}
                title="Modal de Ejemplo"
                showCloseButton
            >
                <div className="space-y-4">
                    <Text>Este es un modal genérico del sistema de diseño.</Text>
                    <div className="flex justify-end pt-4">
                        <Button variant="primary" onClick={() => setShowDemoModal(false)}>Entendido</Button>
                    </div>
                </div>
            </Modal>

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                development={{ id: 'DEMO-001', name: 'Desarrollo de Prueba', current_status: 'Pendiente' } as any}
                darkMode={false}
                onConfirm={() => {
                    addNotification('success', 'Eliminado correctamente');
                    setShowDeleteModal(false);
                }}
                onCancel={() => setShowDeleteModal(false)}
            />
        </div>
    );
};

export default DesignSystemCatalog;
