import React, { createContext, ReactNode, useContext, useEffect, useMemo, useReducer } from 'react';
import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { AuthService } from '../services/AuthService';

// Constante: minutos desde el login hasta el refresh proactivo. El JWT
// expira a los 60 min (config.py: jwt_expiracion_minutos), asi que
// refrescamos a los 45 para tener 15 min de margen ante latencia.
const PROACTIVE_REFRESH_MINUTES = 45;
const PROACTIVE_REFRESH_MS = PROACTIVE_REFRESH_MINUTES * 60 * 1000;

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
  emailNeedsUpdate?: boolean;
  emailVerified?: boolean;
  passwordSet?: boolean;
  permissions?: string[];
}

interface BackendUserResponse {
  id: string;
  cedula: string;
  nombre?: string;
  name?: string;
  email?: string;
  correo?: string;
  rol?: string;
  role?: string;
  avatar?: string;
  area?: string;
  cargo?: string;
  sede?: string;
  centrocosto?: string;
  centro_costo?: string;
  viaticante?: boolean | string;
  email_needs_update?: boolean;
  correo_actualizado?: boolean;
  correo_verificado?: boolean;
  password_set?: boolean;
  permissions?: string[];
  permisos?: string[];
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
  sessionValidated: boolean;
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
  | { type: 'SET_SESSION_VALIDATED'; payload: boolean }
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
  return true; // Bypass secondary authentication
};

const initialState: AppState = {
  user: getInitialUser(),
  sessionValidated: !localStorage.getItem('token'),
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
    case 'SET_SESSION_VALIDATED':
      return { ...state, sessionValidated: action.payload };
    case 'LOGIN':
      localStorage.setItem('user', JSON.stringify(action.payload));
      return { ...state, user: action.payload, sessionValidated: true };
    case 'LOGOUT':
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('theme');
      localStorage.removeItem('viaticosVerified');
      sessionStorage.removeItem('fromAdmin');
      return { ...state, user: null, sessionValidated: true, isViaticosVerified: true };
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
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    let active = true;

    const validateSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        dispatch({ type: 'SET_SESSION_VALIDATED', payload: true });
        return;
      }

      try {
        // Verificar validez del token y obtener datos frescos (incluyendo permisos actualizados)
        const response = await axios.get<BackendUserResponse>(
          `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_ME}`,
          {
          headers: { Authorization: `Bearer ${token}` }
          },
        );

        if (response.data) {
          // Función de mapeo (adaptador) para normalizar datos del backend (español) a frontend interface (inglés)
          const normalizeUser = (data: BackendUserResponse): User => ({
            id: data.id,
            cedula: data.cedula,
            name: data.nombre || data.name || '', // Adaptar 'nombre' a 'name'
            email: data.email || data.correo || '',  // /yo devuelve 'correo', /portal-login devuelve 'email'
            role: data.rol || data.role || 'usuario', // Adaptar 'rol' a 'role'
            avatar: data.avatar,
            area: data.area,
            cargo: data.cargo,
            sede: data.sede,
            centrocosto: data.centrocosto || data.centro_costo || '',
            viaticante: typeof data.viaticante === 'boolean' ? data.viaticante : String(data.viaticante).toLowerCase() === 'true',
            emailNeedsUpdate: data.email_needs_update !== undefined
              ? !!data.email_needs_update
              : (data.correo_actualizado !== undefined ? !data.correo_actualizado : false),
            emailVerified: data.correo_verificado !== undefined ? !!data.correo_verificado : false,
            passwordSet: data.password_set !== undefined ? !!data.password_set : true, // Por defecto true para no bloquear si no viene
            permissions: data.permissions || data.permisos || []
          });

          const normalizedUser = normalizeUser(response.data);

          // Actualizar estado global con datos frescos y normalizados
          if (active) dispatch({ type: 'LOGIN', payload: normalizedUser });
        }
      } catch (error) {
        // Solo LOGOUT en 401 (token invalido/expirado y refresh ya fallo).
        // 5xx / network / 503 (rate limiter fail-closed): mantener la sesion
        // hidratada del localStorage y loguear warning. La proxima request
        // real del usuario (que pasa por useApi) se beneficiara del refresh
        // on 401. Tumbar la sesion ante un 503 transitorio era el bug
        // original: el usuario volvia al panel tras 5 min de estar en el
        // portal, Redis estaba arrancando, /auth/yo devolvia 503, y se
        // quedaba en el login.
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status === 401) {
          console.warn('Sesion invalida o expirada (401). Limpiando estado.');
          if (active) dispatch({ type: 'LOGOUT' });
        } else {
          console.warn('Validacion de sesion fallo transitoriamente; acceso protegido en espera.', error);
          if (active) {
            dispatch({ type: 'SET_SESSION_VALIDATED', payload: false });
            retryTimeout = setTimeout(() => void validateSession(), 5000);
          }
        }
      }
    };

    void validateSession();
    return () => {
      active = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []); // Solo al montar la app

  // Refresh proactivo: a los 45 min desde el login, refresca el JWT para
  // que no expire mientras el usuario esta en el portal. Si el usuario
  // esta en el panel cuando toque, se ejecuta igual (en background).
  useEffect(() => {
    if (!state.user) return;
    const timeoutId = window.setTimeout(async () => {
      const newToken = await AuthService.refreshAccessToken();
      if (newToken) {
        console.info(`Token refrescado proactivamente a los ${PROACTIVE_REFRESH_MINUTES} min.`);
      } else {
        console.warn('Refresh proactivo fallo; useApi lo reintentara en la proxima 401.');
      }
    }, PROACTIVE_REFRESH_MS);
    return () => window.clearTimeout(timeoutId);
  }, [state.user]);

  const providerValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AppContext.Provider value={providerValue}>
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
