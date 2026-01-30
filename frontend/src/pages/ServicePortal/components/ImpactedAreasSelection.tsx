import React from 'react';
import { Briefcase, X } from 'lucide-react';
import { Button, Title, Text, Input } from '../../../components/atoms';

interface ImpactedAreasSelectionProps {
    areaInput: string;
    setAreaInput: (val: string) => void;
    addArea: () => void;
    impactedAreas: string[];
    removeArea: (area: string) => void;
}

export const ImpactedAreasSelection: React.FC<ImpactedAreasSelectionProps> = ({
    areaInput,
    setAreaInput,
    addArea,
    impactedAreas,
    removeArea
}) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                <Briefcase size={18} /><Title variant="h6" className="font-bold uppercase tracking-wider">Áreas Impactadas (Obligatorio)</Title>
                <div className="flex-grow border-t border-[var(--color-border)]"></div>
            </div>
            <div className="space-y-3">
                <div className="flex space-x-2">
                    <Input
                        placeholder="Escriba un área y presione Enter..."
                        value={areaInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAreaInput(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addArea();
                            }
                        }}
                    />
                    <Button type="button" onClick={addArea} variant="primary">Añadir</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {impactedAreas.map((area, idx) => (
                        <div key={idx} className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-3 py-1 rounded-full flex items-center space-x-2 border border-[var(--color-primary)]/20 shadow-sm">
                            <Text variant="caption" weight="bold">{area}</Text>
                            <X size={14} className="cursor-pointer hover:text-red-500 transition-colors" onClick={() => removeArea(area)} />
                        </div>
                    ))}
                </div>
                <Input type="hidden" name="areas_impactadas" value={JSON.stringify(impactedAreas)} />
            </div>
        </div>
    );
};
