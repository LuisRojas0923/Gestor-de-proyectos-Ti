import axios from 'axios';
import { API_CONFIG } from '../config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/erp/centro-costo`;

export interface CostCenterItem {
  codigo: string;
  nombre: string;
  activo: boolean;
}

const getHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

export const CentroCostoService = {
  // UEN
  getUens: async (): Promise<CostCenterItem[]> => {
    const res = await axios.get(`${API_BASE_URL}/uen`, getHeaders());
    return res.data;
  },
  saveUen: async (codigo: string, nombre: string, activo: boolean = true): Promise<CostCenterItem> => {
    const res = await axios.post(`${API_BASE_URL}/uen`, { codigo, nombre, activo }, getHeaders());
    return res.data;
  },
  deleteUen: async (codigo: string): Promise<CostCenterItem> => {
    const res = await axios.delete(`${API_BASE_URL}/uen/${codigo}`, getHeaders());
    return res.data;
  },
  activateUen: async (codigo: string): Promise<CostCenterItem> => {
    const res = await axios.post(`${API_BASE_URL}/uen/${codigo}/activar`, {}, getHeaders());
    return res.data;
  },

  // Subcentros
  getSubcentros: async (): Promise<CostCenterItem[]> => {
    const res = await axios.get(`${API_BASE_URL}/subcentro`, getHeaders());
    return res.data;
  },
  saveSubcentro: async (codigo: string, nombre: string, activo: boolean = true): Promise<CostCenterItem> => {
    const res = await axios.post(`${API_BASE_URL}/subcentro`, { codigo, nombre, activo }, getHeaders());
    return res.data;
  },
  deleteSubcentro: async (codigo: string): Promise<CostCenterItem> => {
    const res = await axios.delete(`${API_BASE_URL}/subcentro/${codigo}`, getHeaders());
    return res.data;
  },
  activateSubcentro: async (codigo: string): Promise<CostCenterItem> => {
    const res = await axios.post(`${API_BASE_URL}/subcentro/${codigo}/activar`, {}, getHeaders());
    return res.data;
  },

  // Especialidades
  getEspecialidades: async (): Promise<CostCenterItem[]> => {
    const res = await axios.get(`${API_BASE_URL}/especialidad`, getHeaders());
    return res.data;
  },
  saveEspecialidad: async (codigo: string, nombre: string, activo: boolean = true): Promise<CostCenterItem> => {
    const res = await axios.post(`${API_BASE_URL}/especialidad`, { codigo, nombre, activo }, getHeaders());
    return res.data;
  },
  deleteEspecialidad: async (codigo: string): Promise<CostCenterItem> => {
    const res = await axios.delete(`${API_BASE_URL}/especialidad/${codigo}`, getHeaders());
    return res.data;
  },
  activateEspecialidad: async (codigo: string): Promise<CostCenterItem> => {
    const res = await axios.post(`${API_BASE_URL}/especialidad/${codigo}/activar`, {}, getHeaders());
    return res.data;
  },
};
