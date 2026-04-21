import { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { useApi } from '../../../hooks/useApi';

export const useProfileSettings = () => {
    const { state, dispatch } = useAppContext();
    const { user, darkMode } = state;
    const { patch } = useApi();
    const { addNotification } = useNotifications();
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

    const [profile, setProfile] = useState({
        name: user?.name || 'Usuario Demo',
        email: user?.email || 'usuario@refridcol.com',
        role: user?.role || 'Analista Senior',
        timezone: 'America/Bogota',
        avatar: '',
    });

    const handleProfileUpdate = () => {
        addNotification('success', 'Perfil actualizado correctamente');
    };

    const handleEmailUpdate = async (newEmail: string) => {
        setIsUpdatingEmail(true);
        try {
            const response = await patch('/auth/profile/update-email', { correo: newEmail });
            if (response.data) {
                // Actualizar el usuario en el contexto global
                dispatch({ 
                    type: 'SET_USER', 
                    payload: { 
                        ...state.user!, 
                        email: newEmail, 
                        emailNeedsUpdate: false 
                    } 
                });
                // Actualizar en localStorage para persistencia tras refresh
                const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ 
                    ...savedUser, 
                    email: newEmail, 
                    email_needs_update: false,
                    correo_actualizado: true 
                }));
                
                addNotification('success', 'Correo corporativo actualizado y sincronizado con el ERP.');
            }
        } catch (error: any) {
            console.error('Error updating email:', error);
            addNotification('error', error.response?.data?.detail || 'No se pudo actualizar el correo corporativo.');
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const toggleDarkMode = () => {
        dispatch({ type: 'TOGGLE_DARK_MODE' });
    };

    return {
        profile,
        setProfile,
        handleProfileUpdate,
        handleEmailUpdate,
        isUpdatingEmail,
        darkMode,
        toggleDarkMode,
        user
    };
};
