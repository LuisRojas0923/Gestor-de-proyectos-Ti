import axios from 'axios';
import { API_CONFIG } from '../config/api';

/** Headers con el token JWT */
function getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

export const ImpuestosService = {
    /**
     * Descarga la plantilla de Excel para el formato 2276
     */
    async descargarPlantilla() {
        try {
            const response = await axios.get(`${API_CONFIG.BASE_URL}/impuestos/template`, {
                headers: getAuthHeaders(),
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Plantilla_2276.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error al descargar plantilla', error);
            throw error;
        }
    },

    /**
     * Sube el archivo Excel del formato 2276
     */
    async subirExogena(file: File, ano: number) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await axios.post(
                `${API_CONFIG.BASE_URL}/impuestos/upload?ano_gravable=${ano}`,
                formData,
                {
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Error al subir archivo';
        }
    },

    /**
     * Obtiene los años en los que el usuario tiene certificados disponibles
     */
    async getAñosDisponibles() {
        try {
            const response = await axios.get(`${API_CONFIG.BASE_URL}/impuestos/certificados/años`, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Error al obtener años';
        }
    },

    /**
     * Descarga el PDF del formato 220
     */
    async descargarCertificado220(ano: number, cedulaTarget?: string) {
        try {
            let url = `${API_CONFIG.BASE_URL}/impuestos/certificado-220/${ano}`;
            if (cedulaTarget) url += `?cedula_target=${cedulaTarget}`;

            const response = await axios.get(url, {
                headers: getAuthHeaders(),
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `Certificado_220_${ano}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error: any) {
            throw error.response?.data?.detail || 'Error al descargar certificado';
        }
    },

    /**
     * Obtiene todos los registros cargados (Solo contabilidad/admin)
     */
    async getRegistrosExogena(ano?: number) {
        try {
            let url = `${API_CONFIG.BASE_URL}/impuestos/admin/registros`;
            if (ano) url += `?ano=${ano}`;
            const response = await axios.get(url, { headers: getAuthHeaders() });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Error al obtener registros';
        }
    }
};
