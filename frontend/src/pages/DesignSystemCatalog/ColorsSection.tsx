import React from 'react';
import { MaterialCard, Text } from '../../components/atoms';
import { materialDesignTokens } from '../../components/tokens';

const ColorsSection: React.FC = () => {
    return (
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
                            {Object.entries(materialDesignTokens.colors.primary).map(([key, value]) => {
                                const swatchStyle = { backgroundColor: value };
                                return (
                                    <div key={key} className="space-y-1">
                                        <div
                                            className="h-12 w-full rounded-lg shadow-sm"
                                            style={swatchStyle}
                                        />
                                        <div className="text-center">
                                            <Text variant="caption" className="font-mono block text-[var(--color-text-secondary)]">{key}</Text>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <Text variant="subtitle2" className="mb-4 uppercase tracking-wider">Secondary</Text>
                        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
                            {Object.entries(materialDesignTokens.colors.secondary).map(([key, value]) => {
                                const swatchStyle = { backgroundColor: value };
                                return (
                                    <div key={key} className="space-y-1">
                                        <div
                                            className="h-12 w-full rounded-lg shadow-sm"
                                            style={swatchStyle}
                                        />
                                        <div className="text-center">
                                            <Text variant="caption" className="font-mono block text-[var(--color-text-secondary)]">{key}</Text>
                                        </div>
                                    </div>
                                );
                            })}
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
    );
};

export default ColorsSection;
