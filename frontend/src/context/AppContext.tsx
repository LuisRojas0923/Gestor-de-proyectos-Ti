import React, { createContext, ReactNode, useContext, useReducer } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

// Types
interface User {
  id: string;
  cedula: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  area?: string;
  cargo?: string;
  sede?: string;
  centrocosto?: string;
  viaticante?: boolean;
  permissions?: string[];
}

interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'new' | 'validated' | 'testing' | 'completed' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  controls: string[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'testing' | 'blocked' | 'approved';
  requirementId: string;
  estimatedHours: number;
  actualHours: number;
  assignedTo: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  link?: string;
}

interface AppState {
  user: User | null;
  darkMode: boolean;
  sidebarOpen: boolean;
  requirements: Requirement[];
  tasks: Task[];
  notifications: Notification[];
  refreshKey: number;
  loading: boolean;
  error: string | null;
  isViaticosVerified: boolean;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_REQUIREMENTS'; payload: Requirement[] }
  | { type: 'ADD_REQUIREMENT'; payload: Requirement }
  | { type: 'UPDATE_REQUIREMENT'; payload: { id: string; data: Partial<Requirement> } }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; data: Partial<Task> } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'REFRESH_DATA' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_VIATICOS_VERIFIED'; payload: boolean };

// Función para obtener el estado inicial del modo oscuro desde localStorage
const getInitialDarkMode = (): boolean => {
  try {
    const savedDarkMode = localStorage.getItem('darkMode');
    return savedDarkMode ? JSON.parse(savedDarkMode) : false;
  } catch (error) {
    console.warn('Error al cargar el modo oscuro desde localStorage:', error);
    return false;
  }
};

// Función para obtener el usuario inicial desde localStorage
const getInitialUser = (): User | null => {
  try {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    console.warn('Error al cargar el usuario desde localStorage:', error);
    return null;
  }
};

// Función para obtener la verificación de viáticos desde localStorage (con expiración de 4 horas)
const getInitialViaticosVerified = (): boolean => {
  try {
    const saved = localStorage.getItem('viaticosVerified');
    if (!saved) return false;

    const { verified, timestamp } = JSON.parse(saved);
    const now = new Date().getTime();
    const fourHours = 4 * 60 * 60 * 1000;

    if (verified && (now - timestamp) < fourHours) {
      return true;
    }

    localStorage.removeItem('viaticosVerified');
    return false;
  } catch (error) {
    return false;
  }
};

const initialState: AppState = {
  user: getInitialUser(),
  darkMode: getInitialDarkMode(),
  sidebarOpen: true,
  requirements: [],
  tasks: [],
  notifications: [],
  refreshKey: 0,
  loading: false,
  error: null,
  isViaticosVerified: getInitialViaticosVerified(),
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'LOGIN':
      localStorage.setItem('user', JSON.stringify(action.payload));
      return { ...state, user: action.payload };
    case 'LOGOUT':
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('theme');
      localStorage.removeItem('viaticosVerified');
      return { ...state, user: null, isViaticosVerified: false };
    case 'TOGGLE_DARK_MODE': {
      const newDarkMode = !state.darkMode;
      // Guardar en localStorage
      try {
        localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
      } catch (error) {
        console.warn('Error al guardar el modo oscuro en localStorage:', error);
      }
      return { ...state, darkMode: newDarkMode };
    }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_REQUIREMENTS':
      return { ...state, requirements: action.payload };
    case 'ADD_REQUIREMENT':
      return { ...state, requirements: [...state.requirements, action.payload] };
    case 'UPDATE_REQUIREMENT':
      return {
        ...state,
        requirements: state.requirements.map(req =>
          req.id === action.payload.id ? { ...req, ...action.payload.data } : req
        ),
      };
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? { ...task, ...action.payload.data } : task
        ),
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50), // Limit to 50
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };
    case 'REFRESH_DATA':
      return {
        ...state,
        refreshKey: state.refreshKey + 1,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_VIATICOS_VERIFIED':
      if (action.payload) {
        localStorage.setItem('viaticosVerified', JSON.stringify({
          verified: true,
          timestamp: new Date().getTime()
        }));
      } else {
        localStorage.removeItem('viaticosVerified');
      }
      return { ...state, isViaticosVerified: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Sincronización global de sesión al cargar la app
  React.useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        // Verificar validez del token y obtener datos frescos (incluyendo permisos actualizados)
        const response = await axios.get(`${API_CONFIG.BASE_URL}/auth/yo`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data) {
          // Función de mapeo (adaptador) para normalizar datos del backend (español) a frontend interface (inglés)
          const normalizeUser = (data: any): User => ({
            id: data.id,
            cedula: data.cedula,
            name: data.nombre || data.name || '', // Adaptar 'nombre' a 'name'
            email: data.email,
            role: data.rol || data.role || 'usuario', // Adaptar 'rol' a 'role'
            avatar: data.avatar,
            area: data.area,
            cargo: data.cargo,
            sede: data.sede,
            centrocosto: data.centrocosto || data.centro_costo || '',
            viaticante: typeof data.viaticante === 'boolean' ? data.viaticante : String(data.viaticante).toLowerCase() === 'true',
            permissions: data.permissions || data.permisos || []
          });

          const normalizedUser = normalizeUser(response.data);

          // Actualizar estado global con datos frescos y normalizados
          dispatch({ type: 'LOGIN', payload: normalizedUser });
        }
      } catch (error) {
        console.error('Sesión inválida o expirada:', error);
        // Si el token no sirve, limpiar todo para evitar estados corruptos
        dispatch({ type: 'LOGOUT' });
      }
    };

    validateSession();
  }, []); // Solo al montar la app

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export type { AppAction, AppState, Requirement, Task, User, Notification };
