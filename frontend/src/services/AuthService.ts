import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';

/**
 * Servicio para manejar operaciones de autenticación y gestión de usuarios
 */
export const AuthService = {
    /**
     * Crea un nuevo analista validando contra Solid ERP
     */
    async createAnalyst(cedula: string) {
        try {
            const response = await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_LOGIN.replace('/login', '/analistas/crear')}`, {
                cedula
            });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Error al crear analista';
        }
    },

    /**
     * Cambia la contraseña del usuario actual
     */
    async changePassword(contrasena_actual: string, nueva_contrasena: string) {
        try {
            // Nota: En una implementación real, el token JWT se envía automáticamente si axios está configurado
            const response = await axios.patch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_LOGIN.replace('/login', '/password')}`, {
                contrasena_actual,
                nueva_contrasena
            });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Error al cambiar contraseña';
        }
    }
};
