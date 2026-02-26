import React from 'react';
import { Key, EyeOff, Eye, Copy } from 'lucide-react';
import { Title, Text, MaterialCard, Input, Button } from '../../../components/atoms';

interface ApiTokenSectionProps {
    apiTokens: any[];
    showTokenForm: boolean;
    setShowTokenForm: (val: boolean) => void;
    newToken: any;
    setNewToken: any;
    generateApiToken: () => void;
    deleteToken: (id: string) => void;
    toggleTokenVisibility: (id: string) => void;
    copyToken: (token: string) => void;
}

const ApiTokenSection: React.FC<ApiTokenSectionProps> = ({
    apiTokens, showTokenForm, setShowTokenForm, newToken, setNewToken,
    generateApiToken, deleteToken, toggleTokenVisibility, copyToken
}) => (
    <MaterialCard className="p-6">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
                <Key className="text-[var(--color-text-secondary)]" size={24} />
                <Title variant="h5" weight="semibold" color="text-primary">Tokens API</Title>
            </div>
            <Button onClick={() => setShowTokenForm(!showTokenForm)} variant="secondary" icon={Key}>Nuevo Token</Button>
        </div>

        {showTokenForm && (
            <div className="p-4 mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-variant)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Input placeholder="Nombre del token" value={newToken.name} onChange={(e) => setNewToken((prev: any) => ({ ...prev, name: e.target.value }))} />
                    <Input placeholder="Descripción (opcional)" value={newToken.description} onChange={(e) => setNewToken((prev: any) => ({ ...prev, description: e.target.value }))} />
                </div>
                <div className="flex space-x-2">
                    <Button onClick={generateApiToken} variant="primary">Generar Token</Button>
                    <Button onClick={() => setShowTokenForm(false)} variant="outline">Cancelar</Button>
                </div>
            </div>
        )}

        <div className="space-y-4">
            {apiTokens.map(token => (
                <div key={token.id} className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-variant)]">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <Title variant="h6" weight="medium" color="text-primary">{token.name}</Title>
                            <Text variant="body2" color="text-secondary">Creado: {token.created} • Último uso: {token.lastUsed}</Text>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteToken(token.id)} className="text-red-500 hover:text-red-700 transition-colors">Eliminar</Button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <code className="flex-1 px-3 py-2 rounded font-mono text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                            {token.isVisible ? token.token : '•'.repeat(20) + token.token.slice(-4)}
                        </code>
                        <Button variant="ghost" size="sm" onClick={() => toggleTokenVisibility(token.id)} icon={token.isVisible ? EyeOff : Eye}>
                            {token.isVisible ? 'Ocultar' : 'Mostrar'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => copyToken(token.token)} icon={Copy}>Copiar</Button>
                    </div>
                </div>
            ))}
        </div>
    </MaterialCard>
);

export default ApiTokenSection;
