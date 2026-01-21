import React, { useState } from 'react';
import { MaterialCard, Text, Input, Select, Textarea, Switch, Checkbox } from '../../components/atoms';
import { Search } from 'lucide-react';

const FormsSection: React.FC = () => {
    const [inputVal, setInputVal] = useState('');
    const [selectVal, setSelectVal] = useState('');
    const [switchVal, setSwitchVal] = useState(false);
    const [checkVal, setCheckVal] = useState(false);

    return (
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
    );
};

export default FormsSection;
