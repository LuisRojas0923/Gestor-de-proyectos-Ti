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
    },

    /**
     * Actualiza el correo corporativo del usuario (sincroniza con ERP).
     */
    async updateEmail(correo: string) {
        const headers = getAuthHeaders();
        try {
            const response = await axios.patch(
                `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_UPDATE_EMAIL}`,
                { correo },
                { headers }
            );
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Error al actualizar el correo corporativo';
        }
    },

    /**
     * Refresca el JWT actual llamando a POST /auth/refresh.
     *
     * El token actual debe ser valido (firma OK y no expirado). Si la
     * peticion tiene exito, el nuevo token se guarda en localStorage
     * (reemplazando al anterior) y se retorna.
     *
     * Si falla (401, red, etc.), retorna null sin lanzar excepcion: el
     * caller decide si hacer logout o no.
     */
    async refreshAccessToken(): Promise<string | null> {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return null;
        try {
            const response = await axios.post(
                `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_LOGIN.replace('/login', '/refresh')}`,
                {},
                { headers }
            );
            const newToken: string | undefined = response.data?.access_token;
            if (newToken && typeof newToken === 'string') {
                localStorage.setItem('token', newToken);
                return newToken;
            }
            return null;
        } catch {
            return null;
        }
    }
};
