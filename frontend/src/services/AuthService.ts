import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';

/** Headers con el token JWT para endpoints que requieren autenticación */
function getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

/**
 * Servicio para manejar operaciones de autenticación y gestión de usuarios
 */
export const AuthService = {
    /**
     * Crea un nuevo analista validando contra Solid ERP
     */
    async createAnalyst(cedula: string) {
        try {
            const response = await axios.post(
                `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_LOGIN.replace('/login', '/analistas/crear')}`,
                { cedula },
                { headers: getAuthHeaders() }
            );
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Error al crear analista';
        }
    },

    /**
     * Cambia la contraseña del usuario actual (requiere estar logueado; envía el token JWT).
     */
    async changePassword(contrasena_actual: string, nueva_contrasena: string) {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            throw 'Debes iniciar sesión para poder cambiar la contraseña. Cierra sesión y vuelve a entrar.';
        }
        try {
            const response = await axios.patch(
                `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_LOGIN.replace('/login', '/password')}`,
                { contrasena_actual, nueva_contrasena },
                { headers }
            );
            return response.data;
        } catch (error: any) {
            const status = error.response?.status;
            const detail = error.response?.data?.detail;
            if (status === 401) {
                throw detail || 'Sesión expirada o inválida. Cierra sesión e inicia sesión de nuevo, luego intenta cambiar la contraseña.';
            }
            throw typeof detail === 'string' ? detail : 'Error al cambiar contraseña';
        }
    }
};
