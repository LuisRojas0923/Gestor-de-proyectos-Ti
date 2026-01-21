import React from 'react';
import { MaterialCard, Title, Subtitle, Text, Icon } from '../../components/atoms';
import { Star, Info, CheckCircle, XCircle, AlertCircle, Settings, User, Calendar, Cloud } from 'lucide-react';

const IconsSection: React.FC = () => {
    return (
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
    );
};

export default IconsSection;
