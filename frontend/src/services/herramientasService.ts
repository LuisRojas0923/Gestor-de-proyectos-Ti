import axios from 'axios';
import { API_CONFIG } from '../config/api';
import { HerramientaInformatica } from '../types/herramientas';

/** Headers con el token JWT */
function getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

export const herramientasService = {
    async getAll(): Promise<HerramientaInformatica[]> {
        const response = await axios.get(`${API_CONFIG.BASE_URL}/herramientas-informaticas`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    async getById(id: number): Promise<HerramientaInformatica> {
        const response = await axios.get(`${API_CONFIG.BASE_URL}/herramientas-informaticas/${id}`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    async create(data: Partial<HerramientaInformatica>): Promise<HerramientaInformatica> {
        const response = await axios.post(`${API_CONFIG.BASE_URL}/herramientas-informaticas`, data, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    async update(id: number, data: Partial<HerramientaInformatica>): Promise<HerramientaInformatica> {
        const response = await axios.put(`${API_CONFIG.BASE_URL}/herramientas-informaticas/${id}`, data, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await axios.delete(`${API_CONFIG.BASE_URL}/herramientas-informaticas/${id}`, {
            headers: getAuthHeaders()
        });
    },

    async exportExcel(): Promise<void> {
        const response = await axios.get(`${API_CONFIG.BASE_URL}/herramientas-informaticas/export-excel`, {
            headers: getAuthHeaders(),
            responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Inventario_Herramientas_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }
};
