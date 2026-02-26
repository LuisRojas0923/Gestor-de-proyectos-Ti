import { useState } from 'react';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

export const useApiTokenSettings = () => {
    const { addNotification } = useNotifications();
    const [apiTokens, setApiTokens] = useState([
        { id: '1', name: 'Token Principal', token: 'pk_live_51234567890abcdef', created: '2025-01-10', lastUsed: '2025-01-20', isVisible: false }
    ]);
    const [newToken, setNewToken] = useState({ name: '', description: '' });
    const [showTokenForm, setShowTokenForm] = useState(false);

    const generateApiToken = () => {
        if (!newToken.name) { addNotification('error', 'Ingresa un nombre para el token'); return; }
        const token = {
            id: Date.now().toString(), name: newToken.name,
            token: `pk_live_${Math.random().toString(36).substr(2, 24)}`,
            created: new Date().toISOString().split('T')[0], lastUsed: 'Nunca', isVisible: false,
        };
        setApiTokens(prev => [...prev, token]);
        setNewToken({ name: '', description: '' });
        setShowTokenForm(false);
        addNotification('success', 'Token API generado correctamente');
    };

    const copyToken = (token: string) => {
        navigator.clipboard.writeText(token);
        addNotification('success', 'Token copiado al portapapeles');
    };

    const deleteToken = (id: string) => {
        setApiTokens(prev => prev.filter(token => token.id !== id));
        addNotification('success', 'Token eliminado');
    };

    const toggleTokenVisibility = (id: string) => {
        setApiTokens(prev => prev.map(t => t.id === id ? { ...t, isVisible: !t.isVisible } : t));
    };

    return {
        apiTokens, generateApiToken, copyToken, deleteToken, toggleTokenVisibility,
        newToken, setNewToken, showTokenForm, setShowTokenForm
    };
};
