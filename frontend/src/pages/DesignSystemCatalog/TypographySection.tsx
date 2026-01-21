import React from 'react';
import { MaterialCard, Title, Subtitle, Text } from '../../components/atoms';

const TypographySection: React.FC = () => {
    return (
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
    );
};

export default TypographySection;
