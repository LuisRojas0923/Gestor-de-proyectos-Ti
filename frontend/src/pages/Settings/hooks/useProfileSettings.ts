import { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

export const useProfileSettings = () => {
    const { state, dispatch } = useAppContext();
    const { user, darkMode } = state;
    const { addNotification } = useNotifications();

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

    const toggleDarkMode = () => {
        dispatch({ type: 'TOGGLE_DARK_MODE' });
    };

    return {
        profile,
        setProfile,
        handleProfileUpdate,
        darkMode,
        toggleDarkMode,
        user
    };
};
